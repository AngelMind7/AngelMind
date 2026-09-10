import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve("contracts/blueprint-layout.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const failures = [];
for (const [target, entry] of Object.entries(manifest.targets ?? {})) {
  if (!existsSync(resolve(target))) failures.push(`missing target directory: ${target}`);
  for (const current of entry.current ?? []) {
    const checkPath = current.includes("*") ? current.split("*")[0].replace(/\/$/, "") : current;
    if (!existsSync(resolve(checkPath))) failures.push(`missing mapped implementation: ${current}`);
  }
  if (!entry.status) failures.push(`missing status: ${target}`);
}
if (manifest.policy !== "compatibility-first") failures.push("unsafe migration policy");
if (!manifest.migrationBaseline) failures.push("missing migration baseline");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Blueprint layout contract OK: ${Object.keys(manifest.targets).length} target boundaries; policy=${manifest.policy}; baseline=${manifest.migrationBaseline}`);
