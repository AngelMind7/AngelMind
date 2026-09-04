import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const routerSource = read("server/routers.ts");
const countTrpcLeaves = (source) =>
  (source.match(/^\s*[A-Za-z0-9_$]+\s*:\s*(?:admin|protected|public)Procedure\b/gm) ?? []).length;
const concreteTrpcLeaves = countTrpcLeaves(routerSource);

const restFiles = [
  "server/rest-v1.ts",
  "server/rest-v1-core-resources.ts",
  "server/rest-v1-tags-notes.ts",
  "server/rest-v1-evidence-resources.ts",
  "server/rest-v1-evidence-findings.ts",
  "server/rest-v1-tools.ts",
  "server/rest-v1-redteam.ts",
  "server/rest-v1-purple-team.ts",
  "server/rest-v1-bug-bounty.ts",
  "server/rest-v1-reporting.ts",
  "server/rest-v1-threat-intelligence.ts",
  "server/rest-v1-ai-automation.ts",
  "server/rest-v1-governance.ts",
  "server/simulation-rest.ts",
];
const restEndpointPattern = /\bapp\.(get|post|put|patch|delete)\(\"(\/api\/v1\/[^\"]+)\"/g;
const concreteRestKeys = new Set();
for (const file of restFiles) for (const match of read(file).matchAll(restEndpointPattern)) concreteRestKeys.add(`${match[1].toUpperCase()} ${match[2]}`);
const concreteRestRoutes = concreteRestKeys.size;
const concreteApiSurface = concreteTrpcLeaves + concreteRestRoutes;

const contractSource = read("server/api-v1-contract.ts");
const namedContractEntries = [
  ...contractSource.matchAll(/endpoint\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/g),
];

const minimumExecutable = 260;
if (concreteApiSurface < minimumExecutable) throw new Error(`Concrete API surface has only ${concreteApiSurface} unique endpoints (${concreteTrpcLeaves} tRPC + ${concreteRestRoutes} REST); expected at least ${minimumExecutable}.`);
if (namedContractEntries.length < 240) throw new Error(`Named V4 REST contract has only ${namedContractEntries.length} entries; expected at least 240.`);

console.log(JSON.stringify({ ok: true, concreteTrpcLeaves, concreteRestRoutes, concreteApiSurface, namedRestContractEntries: namedContractEntries.length, blueprintTarget: "260+" }, null, 2));
