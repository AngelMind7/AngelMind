import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const routerSource = read("src/c2/server/routers.ts");
const countTrpcLeaves = (source) =>
  (source.match(/^\s*[A-Za-z0-9_$]+\s*:\s*(?:admin|protected|public)Procedure\b/gm) ?? []).length;
const concreteTrpcLeaves = countTrpcLeaves(routerSource);

const restFiles = [
  "src/c2/server/rest-v1.ts",
  "src/c2/server/rest-v1-core-resources.ts",
  "src/c2/server/rest-v1-tags-notes.ts",
  "src/c2/server/rest-v1-evidence-findings.ts",
  "src/c2/server/rest-v1-tools.ts",
  "src/c2/server/rest-v1-redteam.ts",
  "src/c2/server/rest-v1-purple-team.ts",
  "src/c2/server/rest-v1-bug-bounty.ts",
  "src/c2/server/rest-v1-reporting.ts",
  "src/c2/server/rest-v1-threat-intelligence.ts",
  "src/c2/server/rest-v1-ai-automation.ts",
  "src/c2/server/rest-v1-governance.ts",
  "src/c2/server/simulation-rest.ts",
];
const restEndpointPattern = /\bapp\.(get|post|put|patch|delete)\(\"(\/api\/v1\/[^\"]+)\"/g;
const concreteRestKeys = new Set();
for (const file of restFiles) for (const match of read(file).matchAll(restEndpointPattern)) concreteRestKeys.add(`${match[1].toUpperCase()} ${match[2]}`);
const concreteRestRoutes = concreteRestKeys.size;
const concreteApiSurface = concreteTrpcLeaves + concreteRestRoutes;

const contractSource = read("src/c2/server/api-v1-contract.ts");
const namedContractEntries = [
  ...contractSource.matchAll(/endpoint\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/g),
];

const minimumExecutable = 260;
if (concreteApiSurface < minimumExecutable) throw new Error(`Concrete API surface has only ${concreteApiSurface} unique endpoints (${concreteTrpcLeaves} tRPC + ${concreteRestRoutes} REST); expected at least ${minimumExecutable}.`);
if (namedContractEntries.length < 240) throw new Error(`Named V4 REST contract has only ${namedContractEntries.length} entries; expected at least 240.`);

console.log(JSON.stringify({ ok: true, concreteTrpcLeaves, concreteRestRoutes, concreteApiSurface, namedRestContractEntries: namedContractEntries.length, blueprintTarget: "260+" }, null, 2));
