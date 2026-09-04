import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const files = Object.fromEntries(await Promise.all([
  "config/tool-runtime-packs.yaml",
  "server/tool-catalog-data.ts",
  "server/tool-runtime.ts",
  "server/tool-runtime-policy.ts",
  "scripts/runtime-tool-smoke-test.sh",
  "Dockerfile.tools",
].map(async path => [path, await readFile(resolve(root, path), "utf8")]));

const expected = ["burp_suite_pro","jwt_tool","dalfox","ssrfmap","interactsh","ffuf","cloudfox","graphql_cop","sqlmap","nuclei","subfinder","httpx","gitleaks","trivy","naabu","katana","custom_scripts"];
const catalogKeysExpected = new Set(["burp_suite_pro","jwt_tool","dalfox","ssrfmap","interactsh","ffuf","cloudfox","secrets_detection.1","graphql_cop","sqlmap","nuclei","asset_intelligence.28","httpx","dependencies.12","naabu","katana","custom_scripts"]);
const catalog = files["server/tool-catalog-data.ts"];
const config = files["config/tool-runtime-packs.yaml"];
const runtime = files["server/tool-runtime.ts"];
const policy = files["server/tool-runtime-policy.ts"];
const smoke = files["scripts/runtime-tool-smoke-test.sh"];
const docker = files["Dockerfile.tools"];
const failures = [];
const catalogKeys = new Set([...catalog.matchAll(/"toolKey":\s*"([^"]+)"/g)].map(match => match[1]));
for (const key of catalogKeysExpected) if (!catalogKeys.has(key)) failures.push(`catalog missing ${key}`);
const generatedFamilies = new Set([...catalog.matchAll(/"(?:recon_|scan_|research_|fuzz_|c2_|phish_|intel_|osint_|post_|custom_)[^"]+"/g)].map(match => match[0]));
if (catalogKeys.size + generatedFamilies.size < 50) failures.push(`catalog must represent at least 50 UTF modules; found ${catalogKeys.size + generatedFamilies.size}`);
for (const key of expected) {
  const runtimeKey = key === "gitleaks" ? "secrets_detection.1" : key === "subfinder" ? "asset_intelligence.28" : key === "trivy" ? "dependencies.12" : key;
  if (!runtime.includes(`toolKey: "${runtimeKey}"`)) failures.push(`runtime adapter missing ${key} (${runtimeKey})`);
}
for (const binary of ["ffuf","dalfox","interactsh-client","cloudfox","nuclei","subfinder","httpx","gitleaks","trivy","sqlmap","jwt_tool.py","ssrfmap","graphql-cop","naabu","katana"]) if (!smoke.includes(binary)) failures.push(`smoke test missing ${binary}`);
for (const binary of ["naabu","katana"]) if (!docker.includes(`go install github.com/projectdiscovery/${binary}`)) failures.push(`tools image does not provision ${binary}`);
for (const key of ["naabu","katana"]) if (!config.includes(`id: ${key}`)) failures.push(`runtime pack manifest missing ${key}`);
for (const required of ["review-required-pack","target_execution_disabled","scope_not_validated","human_approval_required","privileged_mode_blocked"]) if (!policy.includes(required)) failures.push(`runtime policy missing ${required}`);
if (!runtime.includes("ANGELMIND_ENABLE_TARGET_EXECUTION")) failures.push("runtime missing target execution deployment gate");
if (!runtime.includes("canExecuteTool")) failures.push("runtime missing catalog execution policy check");
if (failures.length) { console.error("Tool runtime contract FAILED:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log(`Tool runtime contract OK: ${catalogKeys.size + generatedFamilies.size} UTF modules represented; ${expected.length} executable adapters represented.`);
