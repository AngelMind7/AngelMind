import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const failures = [];
const requireAtLeast = (actual, expected, label) => { if (actual < expected) failures.push(`${label}: expected at least ${expected}, found ${actual}`); };
const requireFile = file => { if (!existsSync(resolve(root, file))) failures.push(`missing required repository contract ${file}`); };

const routeSource = read("client/src/authenticatedRoutes.ts");
const routes = routeSource.match(/path:\s*"[^"]+"/g) ?? [];
requireAtLeast(routes.length, 27, "authenticated routes");
const requiredRoutes = [
  "/dashboard","/mission-control","/coverage","/research","/research/new","/research/:id","/research/:id/objectives","/research/:id/hypotheses","/research/:id/tasks","/research/:id/executions","/research/:id/observations","/research/:id/evidence","/research/:id/findings","/research/:id/reports","/research/:id/timeline",
  "/assets","/assets/new","/assets/:id","/tools","/tools/capabilities","/tools/installed","/tools/health","/tools/history","/tools/:id",
  "/agents","/agents/new","/agents/:id","/playbooks","/playbooks/new","/playbooks/:id","/evidence","/evidence/:id",
  "/ai","/ai/providers","/ai/models","/ai/connections","/ai/routing","/ai/usage","/knowledge","/search","/collaboration","/saved-views","/tags-notes",
  "/reports","/reports/new","/reports/:id","/workspaces","/workspaces/new","/workspaces/:id","/organizations","/organizations/new","/organizations/:id",
  "/governance","/governance/approvals","/governance/policies","/findings","/findings/:id","/audit","/operations","/operations/health","/operations/queue","/operations/workers",
  "/assurance","/assurance/quality","/assurance/compliance","/incidents","/incidents/new","/incidents/:id",
  "/redteam","/redteam/operations","/redteam/operations/new","/redteam/implants","/redteam/phishing",
  "/purpleteam","/purpleteam/exercises","/purpleteam/exercises/new",
  "/bugbounty","/bugbounty/programs","/bugbounty/programs/new","/bugbounty/submissions",
  "/security","/security/sessions","/security/mfa","/security/history","/security/api-keys","/notifications","/notifications/settings",
  "/settings","/settings/profile","/settings/team","/settings/policies","/settings/credentials","/settings/preferences","/settings/integrations","/settings/integrations/new","/settings/developer","/settings/developer/sdk","/settings/developer/keys","/settings/developer/logs","/settings/billing","/settings/billing/invoices","/settings/billing/payment","/settings/billing/upgrade",
  "/privacy","/privacy/export","/privacy/delete","/privacy/requests","/privacy/downloads"
];
for (const route of requiredRoutes) if (!routeSource.includes(`path: "${route}"`)) failures.push(`missing blueprint route ${route}`);

const publicSource = read("client/src/publicRoutes.ts");
for (const route of ["/","/product","/features","/how-it-works","/bug-bounty","/for-researchers","/trust-center","/docs","/blog","/api-playground","/security","/pricing","/changelog","/roadmap","/status","/contact","/academy","/legal/privacy","/legal/terms","/legal/cookies","/legal/acceptable-use","/legal/responsible-disclosure","/legal/data-processing"]) if (!publicSource.includes(`path: "${route}"`)) failures.push(`missing public blueprint route ${route}`);

const domainDocs = ["01-identity","02-organization","03-asset-intel","04-threat-surface","05-vuln-research","06-offensive-engine","07-red-team","08-purple-team","09-bug-bounty","10-findings","11-reporting","12-threat-intel","13-ai-automation","14-governance"];
for (const doc of domainDocs) requireFile(`docs/domain/${doc}.md`);
for (const file of ["docs/application-menu.md","docs/database-schema-contract.md","docs/api/openapi.yaml","docs/api/endpoint-inventory.md","docs/blueprint-conformance.md","docs/launch-gate.md","railway.json","infrastructure/cloudflare/wrangler.toml","infrastructure/supabase/config.toml","infrastructure/firebase/firebase.json","infrastructure/firebase/.firebaserc","infrastructure/firebase/firestore.rules","infrastructure/firebase/firestore.indexes.json","infrastructure/cloudflare/src/index.ts","infrastructure/firebase/functions/index.js","infrastructure/firebase/public/index.html"]) requireFile(file);

const catalog = read("server/tool-catalog-data.ts");
const requiredTools = ["burp_suite_pro","jwt_tool","dalfox","ssrfmap","interactsh","ffuf","cloudfox","graphql_cop","sqlmap","nuclei","subfinder","httpx","gitleaks","trivy","naabu","katana","custom_scripts"];
const toolAliases = { subfinder: "asset_intelligence.28", gitleaks: "secrets_detection.1", trivy: "dependencies.12" };
for (const tool of requiredTools) if (!catalog.includes(`"toolKey":"${tool}"`) && !catalog.includes(`"toolKey": "${tool}"`) && !catalog.includes(`toolKey: "${tool}"`) && !catalog.includes(`toolKey: "${toolAliases[tool] ?? tool}"`) && !catalog.includes(`"toolKey":"${toolAliases[tool] ?? tool}"`)) failures.push(`missing master tool ${tool}`);
const literalModules = (catalog.match(/(?:["']toolKey["']\s*:|\btoolKey\s*:)/g) ?? []).length;
const generatedModules = new Set(catalog.match(/"(?:recon_|scan_|research_|fuzz_|c2_|phish_|intel_|osint_|post_|custom_)[^"]+"/g) ?? []).size;
requireAtLeast(literalModules + generatedModules, 50, "UTF catalog modules");
if (!catalog.includes("enabledByDefault:true") && !catalog.includes("enabledByDefault: true") && !catalog.includes("enabledByDefault = true") && !catalog.includes("\"enabledByDefault\":true") && !catalog.includes("\"enabledByDefault\": true")) failures.push("UTF catalog must expose enabled modules by default");

const normalizer = read("server/evidence-normalizer.ts");
const schemas = ["jwt_token_comparison","sqli_evidence","xss_evidence","ssrf_evidence","cloud_metadata_evidence","graphql_introspection_evidence","graphql_batching_evidence","idor_evidence","ssti_evidence","rce_evidence","host_header_evidence","cache_poisoning_evidence","race_condition_evidence","file_upload_evidence","xxe_evidence"];
for (const schema of schemas) if (!normalizer.includes(`${schema}:`)) failures.push(`missing evidence schema ${schema}`);
const pipeline = read("server/tool-execution-pipeline.ts");
for (const phase of ["validate","prepare","execute","collect","parse","normalize","cleanup"]) if (!pipeline.includes(`"${phase}"`)) failures.push(`missing adapter lifecycle phase ${phase}`);
const runtime = read("server/tool-runtime.ts");
if (!runtime.includes("target_execution_disabled")) failures.push("target-facing execution must fail closed without explicit deployment opt-in");
if (!runtime.includes("canExecuteTool")) failures.push("tool runtime must enforce catalog authorization before spawn");
const governedRunner = read("server/governed-tool-runner.ts");
if (!governedRunner.includes("decideRuntimeResources") || !governedRunner.includes("runtimeConcurrencyLimit")) failures.push("governed runtime resource gate is missing");
const ledger = read("server/execution-ledger.ts");
for (const marker of ["createExecutionLedger","getExecutionProgress","advanceExecutionLedger","persistExecutionReport","completeExecutionLedger","failExecutionLedger"]) if (!ledger.includes(`export async function ${marker}`)) failures.push(`missing execution ledger contract ${marker}`);
const progressEvents = read("server/execution-progress-events.ts");
for (const marker of ["execution.queued","execution.started","execution.progress","execution.completed","execution.failed"]) if (!progressEvents.includes(`"${marker}"`)) failures.push(`missing execution progress event ${marker}`);
if (!read("server/rest-v1.ts").includes("/api/v1/executions/:jobId")) failures.push("missing authenticated execution progress endpoint");
if (!read("client/src/pages/MissionControl.tsx").includes("/api/v1/executions/")) failures.push("Mission Control is not bound to persisted execution progress");

const rules = read("server/engine/correlation-rules.ts");
for (const prefix of ["SEQ","COMP"]) { const expected = prefix === "SEQ" ? 37 : 10; const ids = new Set([...rules.matchAll(new RegExp(`\\b${prefix}-\\d{3}\\b`, "g"))].map(match => match[0])); requireAtLeast(ids.size, expected, `${prefix} correlation rules`); }
const router = read("server/routers.ts");
for (const domain of ["auth","workspace","organization","research","evidence","knowledge","finding","control","audit","tools","ai","notification"]) if (!new RegExp(`\\b${domain}:\\s*router\\(`).test(router)) failures.push(`missing API router domain ${domain}`);
for (const procedure of ["catalog","runtimeAdapters","runtimeHealth","run","approveTask","createObservation","promoteObservationToFinding","createSubmission","createArchive","verifyArchive","runRestoreDrill"]) if (!new RegExp(`\\b${procedure}:\\s*protectedProcedure`).test(router)) failures.push(`missing protected API procedure ${procedure}`);
const migrations = readdirSync(resolve(root, "drizzle")).filter(file => file.endsWith(".sql"));
requireAtLeast(migrations.length, 64, "migration files");
if (!read("runtime/custom_script_runner.py").includes("never executes input as code")) failures.push("custom script runner safety contract is missing");
const toolsDockerfile = read("Dockerfile.tools"); const smoke = read("scripts/runtime-tool-smoke-test.sh");
for (const command of ["ffuf","dalfox","interactsh-client","cloudfox","nuclei","subfinder","httpx","gitleaks","trivy","sqlmap","jwt_tool.py","naabu","katana"]) { if (!smoke.includes(command)) failures.push(`tools smoke suite omits ${command}`); if (!toolsDockerfile.includes(command)) failures.push(`tools image does not provision ${command}`); }
for (const marker of ["docker build --file Dockerfile.tools","docker run --rm angelmind-tools"]) if (!read(".github/workflows/container.yml").includes(marker)) failures.push(`container E2E workflow omits ${marker}`);

if (failures.length) { console.error("Master contract check failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log(`Master contract OK: ${routes.length} routes, 14 domains, ${literalModules + generatedModules} UTF modules, ${schemas.length} evidence schemas, >=47 correlation rules, ${migrations.length} migrations.`);