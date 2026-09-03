import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["server", "client", "shared", "research-service", "scripts"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const ignoredDirectories = new Set(["node_modules", "dist", "coverage", ".git"]);
const uuidBufferCall = /(?:\b(?:uuid\s*\.\s*)?v[356]\s*\(|\b(?:uuid\s*\.\s*)?\b(?:v3|v5|v6)\s*\()/g;
const uuidUnsafeImport = /(?:import|require)[\s\S]{0,160}\b(?:v3|v5|v6)\b[\s\S]{0,80}(?:from\s*["']uuid["']|\(["']uuid["']\))/g;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

const matches = [];
for (const sourceRoot of sourceRoots) {
  const directory = path.join(root, sourceRoot);
  try {
    for (const file of await walk(directory)) {
      const contents = await readFile(file, "utf8");
      for (const match of [...contents.matchAll(uuidBufferCall), ...contents.matchAll(uuidUnsafeImport)]) {
        const before = contents.slice(0, match.index);
        const line = before.split("\n").length;
        matches.push(`${path.relative(root, file)}:${line}`);
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

if (matches.length > 0) {
  console.error(`UUID v3/v5/v6 calls are forbidden in application source because external buffers are unsafe: ${matches.join(", ")}`);
  process.exit(1);
}
console.log("UUID external-buffer guard passed: no v3/v5/v6 calls found in application source.");
