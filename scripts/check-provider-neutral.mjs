import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const legacyName = String.fromCharCode(109, 97, 110, 117, 115);
const forbidden = [
  new RegExp(`\\b${legacyName}\\b`, "i"),
  new RegExp(`__${legacyName}__`, "i"),
  new RegExp(`${legacyName}-storage`, "i"),
  /BUILT_IN_\u0046ORGE/i,
  /OAUTH_\u0053ERVER/i,
  /VITE_\u0041PP_ID/i,
  new RegExp(String.fromCharCode(102, 111, 114, 103, 101, 65, 112, 105), "i"),
  new RegExp(String.fromCharCode(99, 111, 111, 107, 105, 101, 83, 101, 99, 114, 101, 116), "i"),
  new RegExp(`vite-plugin-${legacyName}`, "i"),
];
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage"]);
const ignoredFiles = new Set(["pnpm-lock.yaml"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (!ignoredFiles.has(entry.name)) files.push(fullPath);
  }
  return files;
}

const matches = [];
for (const file of await walk(root)) {
  const contents = await readFile(file, "utf8");
  if (forbidden.some(pattern => pattern.test(contents))) matches.push(path.relative(root, file));
}

if (matches.length > 0) {
  console.error(`Provider-neutral check failed in: ${matches.join(", ")}`);
  process.exit(1);
}
console.log("Provider-neutral check passed");
