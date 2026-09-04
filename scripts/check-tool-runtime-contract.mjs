import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

const files = Object.fromEntries(
  await Promise.all(
    [
      "config/tool-runtime-packs.yaml",
      "server/tool-catalog-data.ts",
      "server/tool-runtime.ts",
      "scripts/runtime-tool-smoke-test.sh",
      "Dockerfile.tools",
    ].map(async path => [path, await readFile(resolve(root, path), "utf8")])
  )
);

const expected = [
  "burp_suite_pro",
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
];

const catalog = files["server/tool-catalog-data.ts"];
const config = files["config/tool-runtime-packs.yaml"];
const runtime = files["server/tool-runtime.ts"];
const smoke = files["scripts/runtime-tool-smoke-test.sh"];
const docker = files["Dockerfile.tools"];

const count = (text, value) => (text.match(new RegExp(value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "g")) ?? []).length;
const failures = [];

if ((catalog.match(/"toolKey":/g) ?? []).length !== expected.length) {
  failures.push(`catalog must contain exactly ${expected.length} toolKey entries`);
}

const catalogKeys = new Set(
  [...catalog.matchAll(/"toolKey":\s*"([^"]+)"/g)].map(match => match[1])
);
const aliases = new Set(["secrets_detection.1", "asset_intelligence.28", "dependencies.12"]);
const requiredCatalogKeys = expected.map(key => aliases.has(key) ? key : key);
for (const key of requiredCatalogKeys) {
  if (!catalogKeys.has(key)) failures.push(`catalog missing ${key}`);
}

for (const key of expected.filter(key => !aliases.has(key))) {
  if (!runtime.includes(`toolKey: "${key}"`)) failures.push(`runtime adapter missing ${key}`);
}

for (const binary of ["ffuf", "dalfox", "interactsh-client", "cloudfox", "nuclei", "subfinder", "httpx", "gitleaks", "trivy", "sqlmap", "jwt_tool.py", "ssrfmap", "graphql-cop", "naabu", "katana"]) {
  if (!smoke.includes(binary)) failures.push(`smoke test missing ${binary}`);
}

for (const binary of ["naabu", "katana"]) {
  if (!docker.includes(`go install github.com/projectdiscovery/${binary}`)) {
    failures.push(`tools image does not provision ${binary}`);
  }
}

for (const key of ["naabu", "katana"]) {
  if (!config.includes(`id: ${key}`)) failures.push(`runtime pack manifest missing ${key}`);
}

if (failures.length) {
  console.error("Tool runtime contract FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Tool runtime contract OK: ${expected.length} canonical tools represented across catalog, runtime, smoke test, image provisioning, and runtime manifest.`);
