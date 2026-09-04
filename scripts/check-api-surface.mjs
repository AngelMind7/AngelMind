import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const routerSource = read("server/routers.ts");
const systemSource = read("server/_core/systemRouter.ts");
const apiSurfaceSource = read("server/_core/apiSurfaceRouter.ts");

const countExecutableLeaves = (source) =>
  (source.match(/^\s*[A-Za-z0-9_$]+\s*:\s*(?:admin|protected|public)Procedure\b/gm) ?? []).length;

const canonicalLeaves = countExecutableLeaves(routerSource);
const platformLeaves = countExecutableLeaves(apiSurfaceSource);
const executableLeaves = canonicalLeaves + platformLeaves;

const contractPath = path.join(root, "server", "api-v1-contract.ts");
const contractSource = fs.readFileSync(contractPath, "utf8");
const namedContractEntries = [
  ...contractSource.matchAll(/endpoint\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/g),
];

if (!/api:\s*apiSurfaceRouter\b/.test(systemSource)) {
  throw new Error("Platform API surface router is not mounted in systemRouter.");
}
if (!/system:\s*systemRouter\b/.test(routerSource)) {
  throw new Error("systemRouter is not mounted in the canonical appRouter.");
}

const minimumExecutable = 260;
if (executableLeaves < minimumExecutable) {
  throw new Error(`Concrete tRPC API surface has only ${executableLeaves} executable leaves; expected at least ${minimumExecutable}.`);
}
if (namedContractEntries.length < 240) {
  throw new Error(`Named V4 REST contract has only ${namedContractEntries.length} entries; expected at least 240.`);
}

console.log(JSON.stringify({
  ok: true,
  canonicalTrpcLeaves: canonicalLeaves,
  platformTrpcLeaves: platformLeaves,
  concreteTrpcLeaves: executableLeaves,
  namedRestContractEntries: namedContractEntries.length,
  blueprintTarget: "260+",
}, null, 2));
