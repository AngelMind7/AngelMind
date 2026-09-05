import { existsSync, readdirSync, readFileSync } from "node:fs";

const requiredFiles = [
  "config/tool-runtime-packs.yaml",
  "Dockerfile.tools",
  "scripts/runtime-tool-smoke-test.sh",
  "scripts/check-tool-runtime-contract.mjs",
  "docs/FULL_IMPLEMENTATION_STATUS.md",
  "docs/EXECUTION_VERTICAL_SLICE.md",
  "docs/RELEASE_GATES.md",
  ".github/workflows/promote-staging.yml",
  ".github/workflows/deploy-production.yml",
  "config/monitoring/angelmind-alerts.yml",
  "config/monitoring/alertmanager.yml",
  "scripts/check-monitoring-contract.mjs",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`missing:${file}`);
}

const manifest = readFileSync("config/tool-runtime-packs.yaml", "utf8");
for (const tool of [
  "burp",
  "jwt_tool",
  "dalfox",
  "ssrfmap",
  "interactsh",
  "ffuf",
  "cloudfox",
  "graphql_cop",
  "sqlmap",
  "nuclei",
  "subfinder",
  "httpx",
  "gitleaks",
  "trivy",
  "naabu",
  "katana",
  "custom_scripts",
]) {
  if (!manifest.includes(`  - ${tool}`) && !manifest.includes(`- id: ${tool}`))
    failures.push(`manifest-tool:${tool}`);
}

const runtime = readFileSync("server/tool-runtime.ts", "utf8");
for (const token of [
  "ANGELMIND_ENABLE_TARGET_EXECUTION",
  "scopeValidated",
  "humanApproval",
  "active_nondestructive",
  "privileged_or_destructive",
]) {
  if (!runtime.includes(token)) failures.push(`runtime-policy:${token}`);
}

const ledger = readFileSync("server/execution-ledger.ts", "utf8");
for (const token of [
  "createExecutionLedger",
  "getExecutionProgress",
  "persistExecutionReport",
  "completeExecutionLedger",
  "failExecutionLedger",
]) {
  if (!ledger.includes(`export async function ${token}`))
    failures.push(`execution-ledger:${token}`);
}
const progressEvents = readFileSync(
  "server/execution-progress-events.ts",
  "utf8"
);
for (const token of [
  "execution.queued",
  "execution.started",
  "execution.progress",
  "execution.completed",
  "execution.failed",
]) {
  if (!progressEvents.includes(`"${token}"`))
    failures.push(`execution-event:${token}`);
}
const runner = readFileSync("server/governed-tool-runner.ts", "utf8");
for (const token of [
  "decideRuntimeResources",
  "runtimeConcurrencyLimit",
  "runRegisteredTool",
]) {
  if (!runner.includes(token)) failures.push(`governed-runner:${token}`);
}
if (
  !readFileSync("server/rest-v1.ts", "utf8").includes(
    "/api/v1/executions/:jobId"
  )
)
  failures.push("execution-api:missing-progress-route");
if (
  !readFileSync("client/src/pages/MissionControl.tsx", "utf8").includes(
    "/api/v1/executions/"
  )
)
  failures.push("execution-ui:missing-persisted-ledger-binding");
const promotion = readFileSync(".github/workflows/promote-staging.yml", "utf8");
for (const token of [
  "PROMOTE-STAGING-IMAGE",
  "/healthz",
  "/readyz",
  "cosign verify",
  "docker buildx imagetools create",
  "sha256:",
]) {
  if (!promotion.includes(token)) failures.push(`promotion-gate:${token}`);
}

const productionDeploy = readFileSync(
  ".github/workflows/deploy-production.yml",
  "utf8"
);
for (const token of [
  "DEPLOY-PRODUCTION",
  "environment:",
  "PRODUCTION_DEPLOY_HOOK_URL",
  "PRODUCTION_DEPLOY_HOOK_TOKEN",
  "cosign verify",
  "/healthz",
  "/readyz",
  "release-",
]) {
  if (!productionDeploy.includes(token))
    failures.push(`production-deploy:${token}`);
}
const workflowDirectory = ".github/workflows";
if (existsSync(workflowDirectory)) {
  for (const name of readdirSync(workflowDirectory)) {
    if (!name.endsWith(".yml") && !name.endsWith(".yaml")) continue;
    const path = `${workflowDirectory}/${name}`;
    const workflow = readFileSync(path, "utf8");
    if (/contents:\s*write/i.test(workflow))
      failures.push(`workflow-write-permission:${name}`);
    if (/git\s+(commit|push)\b/i.test(workflow))
      failures.push(`workflow-repository-mutation:${name}`);
  }
}

if (failures.length) {
  console.error("Release readiness contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Release readiness contract passed.");
