import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routerPath = path.join(root, "server", "routers.ts");
const source = fs.readFileSync(routerPath, "utf8");

// Count executable tRPC leaves in the canonical router. This is intentionally
// separate from the PDF route inventory so documentation cannot satisfy it.
const procedureMatches = source.match(/^\s*[A-Za-z0-9_$]+\s*:\s*(?:admin|protected|public)Procedure\b/gm) ?? [];
const queryMatches = source.match(/^\s*[A-Za-z0-9_$]+\s*:\s*[^\n]*\.(?:query|mutation|subscription)\(/gm) ?? [];
const executableLeaves = procedureMatches.length + queryMatches.length;

const contractPath = path.join(root, "server", "api-v1-contract.ts");
const contractSource = fs.readFileSync(contractPath, "utf8");
const namedContractEntries = [...contractSource.matchAll(/endpoint\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/g)];

const minimumExecutable = 260;
if (executableLeaves < minimumExecutable) {
  throw new Error(`Concrete tRPC API surface has only ${executableLeaves} executable leaves; expected at least ${minimumExecutable}.`);
}
if (namedContractEntries.length < 240) {
  throw new Error(`Named V4 REST contract has only ${namedContractEntries.length} entries; expected at least 240.`);
}

console.log(JSON.stringify({
  ok: true,
  concreteTrpcLeaves: executableLeaves,
  namedRestContractEntries: namedContractEntries.length,
  blueprintTarget: "260+",
}, null, 2));
