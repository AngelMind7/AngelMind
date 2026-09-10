import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const matrixPath = resolve("contracts/acceptance-matrix.json");
const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
const expectedCritical = Array.from({ length: 14 }, (_, i) => `P0-${String(i + 1).padStart(2, "0")}`);
const expectedHard = Array.from({ length: 18 }, (_, i) => `P1-${String(i + 1).padStart(2, "0")}`);
const failures = [];

for (const [name, expected] of [["critical", expectedCritical], ["hard", expectedHard]]) {
  const actual = Object.keys(matrix[name] ?? {}).sort();
  if (actual.join(",") !== expected.sort().join(",")) {
    failures.push(`${name}: expected ${expected.join(",")} but found ${actual.join(",")}`);
  }
  for (const id of expected) {
    const files = matrix[name]?.[id];
    if (!Array.isArray(files) || files.length === 0) failures.push(`${id}: no test evidence mapped`);
    for (const file of files ?? []) {
      if (!existsSync(resolve(file))) failures.push(`${id}: missing evidence file ${file}`);
    }
  }
}

if (failures.length) {
  console.error("Acceptance matrix contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const files = [...new Set([...Object.values(matrix.critical), ...Object.values(matrix.hard)].flat())];
console.log(`Acceptance matrix validated: P0=${expectedCritical.length}, P1=${expectedHard.length}, unique test files=${files.length}`);
if (process.argv.includes("--validate-only")) process.exit(0);

const result = spawnSync("pnpm", ["exec", "vitest", "run", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
