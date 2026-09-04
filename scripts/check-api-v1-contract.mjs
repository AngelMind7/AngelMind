import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contractPath = path.join(root, "server", "api-v1-contract.ts");
const source = fs.readFileSync(contractPath, "utf8");
const entries = [...source.matchAll(/endpoint\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"(?:,\s*"([^"]+)")?\)/g)];
const groups = new Set(entries.map(match => match[1]));
const keys = new Set(entries.map(match => `${match[3]} ${match[4]}`));

if (!source.includes('API_V1_BLUEPRINT_GROUPS = 28')) throw new Error("V4 API contract must declare 28 blueprint route groups.");
if (!source.includes('API_V1_BLUEPRINT_TARGET = "260+"')) throw new Error("V4 API contract must preserve the PDF 260+ API target.");
if (entries.length < 240) throw new Error(`V4 API contract has only ${entries.length} named endpoints; expected at least 240 named routes from the blueprint tables.`);
if (groups.size < 28) throw new Error(`V4 API contract has only ${groups.size} route groups; expected 28.`);
if (keys.size !== entries.length) throw new Error("V4 API contract contains duplicate method/path pairs.");

const requiredConcrete = [
  "POST /api/v1/simulations/run",
  "GET /api/v1/tools/catalog",
  "GET /api/v1/tools/runtime",
  "POST /api/v1/workspaces/:workspaceId/tools/execute",
  "GET /api/v1/executions/:jobId",
];
for (const route of requiredConcrete) if (!keys.has(route)) throw new Error(`Missing concrete V4 route: ${route}`);

console.log(`V4 API contract OK: ${entries.length} named endpoints across ${groups.size} groups; blueprint target remains 260+.`);
