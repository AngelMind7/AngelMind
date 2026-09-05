import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "config/tool-capability-registry.json"), "utf8"));
const catalog = readFileSync(resolve(root, "server/tool-catalog-data.ts"), "utf8");
const failures = [];

if (manifest.schemaVersion < 2) failures.push("UTF manifest schemaVersion must be >= 2");
if (!Array.isArray(manifest.tools) || manifest.tools.length < 50) failures.push(`UTF manifest requires 50+ modules; found ${manifest.tools?.length ?? 0}`);
const ids = new Set();
const adapters = new Set();
const catalogAliases = new Map([["burp_pro", "burp_suite_pro"]]);
const required = ["id", "displayName", "version", "category", "tier", "riskLevel", "approvalRequired", "scope", "execution", "input", "output", "healthCheck"];
for (const tool of manifest.tools ?? []) {
  if (ids.has(tool.id)) failures.push(`duplicate UTF module id: ${tool.id}`);
  ids.add(tool.id);
  if (adapters.has(tool.adapter)) failures.push(`duplicate UTF adapter: ${tool.adapter}`);
  adapters.add(tool.adapter);
  for (const key of required) if (!(key in tool)) failures.push(`module ${tool.id ?? "unknown"} missing manifest field ${key}`);
  if (!tool.scope?.validatesTarget) failures.push(`module ${tool.id} must declare scope validation`);
  if (!tool.output?.transformsTo) failures.push(`module ${tool.id} must declare evidence transformation`);
  if (tool.execution?.disposition === "simulation_only" && tool.execution?.mode !== "simulation") failures.push(`simulation-only module ${tool.id} must use simulation mode`);
  if (["high", "critical"].includes(tool.riskLevel) && !tool.approvalRequired?.required) failures.push(`high-risk module ${tool.id} must require approval`);
  const catalogId = catalogAliases.get(tool.id) ?? tool.id;
  const catalogHasModule = catalog.includes(`\"toolKey\":\"${catalogId}\"`) || catalog.includes(`\"toolKey\": \"${catalogId}\"`) || catalog.includes(`\"${tool.id}\"`);
  if (!catalogHasModule) failures.push(`UTF catalog missing manifest module ${tool.id}`);
}
for (const id of ["burp_pro", "jwt_tool", "dalfox", "ssrfmap", "interactsh", "ffuf", "cloudfox", "gitleaks", "graphql_cop", "sqlmap", "nuclei", "subfinder", "httpx", "trivy", "naabu", "katana", "custom_scripts"]) if (!ids.has(id)) failures.push(`missing required blueprint UTF module ${id}`);

if (failures.length) {
  console.error("UTF module contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`UTF module contract OK: ${manifest.tools.length} governed manifests; unique IDs/adapters; scope, approval, execution, input/output, health and evidence contracts present.`);
