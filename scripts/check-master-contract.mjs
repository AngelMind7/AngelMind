import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const failures = [];
const requireAtLeast = (actual, expected, label) => {
  if (actual < expected) failures.push(`${label}: expected at least ${expected}, found ${actual}`);
};

const routes = read("client/src/authenticatedRoutes.ts").match(/path:\s*"[^"]+"/g) ?? [];
requireAtLeast(routes.length, 27, "authenticated routes");
for (const route of ["/assets", "/tools", "/ai", "/research", "/knowledge", "/findings", "/reports", "/audit"]) {
  if (!routes.some(value => value.includes(`"${route}"`))) failures.push(`missing required route ${route}`);
}

const catalog = read("server/tool-catalog-data.ts");
const requiredTools = ["burp_suite_pro", "jwt_tool", "dalfox", "ssrfmap", "interactsh", "ffuf", "cloudfox", "graphql_cop", "sqlmap", "nuclei", "subfinder", "httpx", "gitleaks", "trivy", "custom_scripts"];
const toolAliases = { subfinder: "asset_intelligence.28", gitleaks: "secrets_detection.1", trivy: "dependencies.12" };
for (const tool of requiredTools) if (!catalog.includes(`"toolKey": "${tool}"`) && !catalog.includes(`"toolKey": "${toolAliases[tool] ?? tool}"`)) failures.push(`missing master tool ${tool}`);
requireAtLeast((catalog.match(/"toolKey":/g) ?? []).length, 15, "tool catalog entries");

const normalizer = read("server/evidence-normalizer.ts");
const schemas = ["jwt_token_comparison", "sqli_evidence", "xss_evidence", "ssrf_evidence", "cloud_metadata_evidence", "graphql_introspection_evidence", "graphql_batching_evidence", "idor_evidence", "ssti_evidence", "rce_evidence", "host_header_evidence", "cache_poisoning_evidence", "race_condition_evidence", "file_upload_evidence", "xxe_evidence"];
for (const schema of schemas) if (!normalizer.includes(`${schema}:`)) failures.push(`missing evidence schema ${schema}`);

const rules = read("server/engine/correlation-rules.ts");
for (const prefix of ["SEQ", "COMP"]) {
  const expected = prefix === "SEQ" ? 37 : 10;
  const ids = new Set([...rules.matchAll(new RegExp(`\\b${prefix}-\\d{3}\\b`, "g"))].map(match => match[0]));
  requireAtLeast(ids.size, expected, `${prefix} correlation rules`);
}

const router = read("server/routers.ts");
for (const domain of ["auth", "workspace", "organization", "research", "evidence", "knowledge", "finding", "control", "audit", "tools", "ai", "notification"]) {
  if (!new RegExp(`\\b${domain}:\\s*router\\(`).test(router)) failures.push(`missing API router domain ${domain}`);
}
const migrations = readdirSync(resolve(root, "drizzle")).filter(file => file.endsWith(".sql"));
requireAtLeast(migrations.length, 63, "migration files");
if (!read("runtime/custom_script_runner.py").includes("never executes input as code")) failures.push("custom script runner safety contract is missing");

if (failures.length) {
  console.error("Master contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Master contract OK: ${routes.length} routes, ${requiredTools.length} tools, ${schemas.length} evidence schemas, >=47 correlation rules, ${migrations.length} migrations.`);
