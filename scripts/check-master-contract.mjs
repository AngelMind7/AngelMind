import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const failures = [];
const requireAtLeast = (actual, expected, label) => { if (actual < expected) failures.push(`${label}: expected at least ${expected}, found ${actual}`); };
const requireFile = file => { if (!existsSync(resolve(root, file))) failures.push(`missing required repository contract ${file}`); };

const apiContract = read("server/api-v1-contract.ts");
const apiEntries = [...apiContract.matchAll(/endpoint\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"(?:,\s*"([^"]+)")?\)/g)];
const apiGroups = new Set(apiEntries.map(match => match[1]));
requireAtLeast(apiEntries.length, 240, "named V4 API endpoints");
requireAtLeast(apiGroups.size, 28, "V4 API route groups");
if (!apiContract.includes('API_V1_BLUEPRINT_TARGET = "260+"')) failures.push("V4 API contract must preserve the PDF 260+ target");
const apiKeys = new Set(apiEntries.map(match => `${match[3]} ${match[4]}`));
if (apiKeys.size !== apiEntries.length) failures.push("V4 API contract contains duplicate method/path pairs");

const router = read("server/routers.ts");
const executableApiLeaves = (router.match(/^\s*[A-Za-z0-9_$]+\s*:\s*(?:admin|protected|public)Procedure\b/gm) ?? []).length;
const restFiles = ["server/rest-v1.ts", "server/rest-v1-core-resources.ts", "server/rest-v1-tags-notes.ts", "server/rest-v1-evidence-findings.ts", "server/rest-v1-tools.ts", "server/simulation-rest.ts"];
const restEndpointPattern = /\bapp\.(get|post|put|patch|delete)\(\"(\/api\/v1\/[^\"]+)\"/g;
const concreteRestKeys = new Set();
for (const file of restFiles) for (const match of read(file).matchAll(restEndpointPattern)) concreteRestKeys.add(`${match[1].toUpperCase()} ${match[2]}`);
const concreteRestRoutes = concreteRestKeys.size;
const concreteApiSurface = executableApiLeaves + concreteRestRoutes;
requireAtLeast(concreteApiSurface, 260, "concrete executable API surface");
for (const domain of ["auth","workspace","organization","research","evidence","knowledge","finding","control","audit","tools","ai","notification"]) if (!new RegExp(`\\b${domain}:\\s*router\\(`).test(router)) failures.push(`missing API router domain ${domain}`);
for (const procedure of ["catalog","runtimeAdapters","runtimeHealth","run","approveTask","createObservation","promoteObservationToFinding","createSubmission","createArchive","verifyArchive","runRestoreDrill"]) if (!new RegExp(`\\b${procedure}:\\s*protectedProcedure`).test(router)) failures.push(`missing protected API procedure ${procedure}`);

const routeSource = read("client/src/authenticatedRoutes.ts");
const routes = routeSource.match(/path:\s*"[^"]+"/g) ?? [];
requireAtLeast(routes.length, 27, "authenticated routes");
const requiredRoutes = [
  "/dashboard","/mission-control","/coverage","/research","/research/new","/research/:id","/research/:id/objectives","/research/:id/hypotheses","/research/:id/tasks","/research/:id/executions","/research/:id/observations","/research/:id/evidence","/research/:id/findings","/research/:id/reports","/research/:id/timeline",
  "/assets","/assets/new","/assets/:id","/tools","/tools/capabilities","/tools/installed","/tools/health","/tools/history","/tools/:id",
  "/ai/workers","/ai/workers/new","/ai/workers/:id","/utf/runners","/utf/runners/new","/utf/runners/:id","/utf/runners/:id/execute","/redteam/implants/:id/beacon","/redteam/implants/:id/status","/playbooks","/playbooks/new","/playbooks/:id","/evidence","/evidence/:id",
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
const utfExecuteIndex = routeSource.indexOf('path: "/utf/runners/:id/execute"');
const utfDynamicIndex = routeSource.indexOf('path: "/utf/runners/:id"');
if (utfExecuteIndex < 0 || utfDynamicIndex < 0 || utfExecuteIndex > utfDynamicIndex) failures.push("UTF execute route must precede dynamic runner-id route to prevent first-match shadowing");

const publicSource = read("client/src/publicRoutes.ts");
for (const route of ["/","/product","/features","/how-it-works","/bug-bounty","/for-researchers","/trust-center","/docs","/blog","/api-playground","/security","/pricing","/changelog","/roadmap","/status","/contact","/academy","/legal/privacy","/legal/terms","/legal/cookies","/legal/acceptable-use","/legal/responsible-disclosure","/legal/data-processing","/client/:orgSlug"]) if (!publicSource.includes(`path: "${route}"`)) failures.push(`missing public blueprint route ${route}`);

const domainDocs = ["01-identity","02-organization","03-asset-intel","04-threat-surface","05-vuln-research","06-offensive-engine","07-red-team","08-purple-team","09-bug-bounty","10-findings","11-reporting","12-threat-intel","13-ai-automation","14-governance"];
for (const doc of domainDocs) requireFile(`docs/domain/${doc}.md`);
for (const file of ["docs/application-menu.md","docs/database-schema-contract.md","docs/api/openapi.yaml","docs/api/endpoint-inventory.md","docs/blueprint-conformance.md","docs/launch-gate.md","docs/architecture/system-architecture.md","docs/architecture/data-flow.md","docs/architecture/security-model.md","railway.json","infrastructure/cloudflare/wrangler.toml","infrastructure/supabase/config.toml","infrastructure/firebase/firebase.json","infrastructure/firebase/.firebaserc","infrastructure/firebase/firestore.rules","infrastructure/firebase/firestore.indexes.json","infrastructure/cloudflare/src/index.ts","infrastructure/firebase/functions/index.js","infrastructure/firebase/public/index.html","server/tool-simulation.ts","server/tool-simulation.test.ts","server/simulation-rest.ts","server/chain-engine.ts","server/egress-policy.ts","server/mobile-analysis.ts","client/src/pages/ClientPortal.tsx","server/v4-gap-closure.ts","server/v4-gap-closure.test.ts"]) requireFile(file);

const gapClosure = read("server/v4-gap-closure.ts");
for (const marker of ["proxy-egress-mesh","mobile-analysis","database-consolidation","custom-script-safety","chain-builder","governed-c2","client-portal","agent-namespaces","targetExecutionEnabled: false","privilegedRuntime: false"]) if (!gapClosure.includes(marker)) failures.push(`V4 gap closure contract missing ${marker}`);

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

const simulation = read("server/tool-simulation.ts");
for (const marker of ["simulateRegisteredTool","synthetic","inputSha256","mode: \"simulation\""]) if (!simulation.includes(marker)) failures.push(`simulation engine missing ${marker}`);
const simulationRest = read("server/simulation-rest.ts");
for (const marker of ["registerSimulationRoutes","/api/v1/simulations/run","authenticateRequest","canAccessWorkspace","simulateGovernedChain"]) if (!simulationRest.includes(marker)) failures.push(`simulation API missing ${marker}`);
const egress = read("server/egress-policy.ts");
for (const marker of ["allowedTargetsOnly","blockInternalRanges","validateEgressPolicy"]) if (!egress.includes(marker)) failures.push(`egress governance missing ${marker}`);
const mobile = read("server/mobile-analysis.ts");
for (const marker of ["static","android_dynamic_queue","ios_self_hosted","authorized-lab-only"]) if (!mobile.includes(marker)) failures.push(`mobile analysis contract missing ${marker}`);

const chainEngine = read("server/chain-engine.ts");
for (const nodeType of ["module","action","condition","foreach","while","parallel","merge","sleep","subchain"]) if (!chainEngine.includes(`"${nodeType}"`)) failures.push(`missing DAG chain node type ${nodeType}`);
if (!chainEngine.includes("cycle_detected") || !chainEngine.includes("planChainExecution")) failures.push("DAG chain validation/planning contract is missing");

const migrations = readdirSync(resolve(root, "drizzle")).filter(file => file.endsWith(".sql"));
requireAtLeast(migrations.length, 64, "migration files");
if (!read("runtime/custom_script_runner.py").includes("never executes input as code")) failures.push("custom script runner safety contract is missing");
const toolsDockerfile = read("Dockerfile.tools"); const smoke = read("scripts/runtime-tool-smoke-test.sh");
for (const command of ["ffuf","dalfox","interactsh-client","cloudfox","nuclei","subfinder","httpx","gitleaks","trivy","sqlmap","jwt_tool.py","naabu","katana"]) { if (!smoke.includes(command)) failures.push(`tools smoke suite omits ${command}`); if (!toolsDockerfile.includes(command)) failures.push(`tools image does not provision ${command}`); }
for (const marker of ["docker build --file Dockerfile.tools","docker run --rm angelmind-tools"]) if (!read(".github/workflows/container.yml").includes(marker)) failures.push(`container E2E workflow omits ${marker}`);

if (failures.length) { console.error("Master contract check failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log(`Master contract OK: ${routes.length} routes, ${concreteApiSurface} concrete API endpoints (${executableApiLeaves} tRPC + ${concreteRestRoutes} REST), 14 domains, ${apiEntries.length} named API endpoints across ${apiGroups.size} groups, ${literalModules + generatedModules} UTF modules, ${schemas.length} evidence schemas, ${migrations.length} migrations, 8 V4 gap closure contracts.`);
