import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = f => readFileSync(resolve(root, f), "utf8");
const failures = [];
for (const file of ["server/purple-team.ts","server/purple-team.test.ts","server/rest-v1-purple-team.ts","docs/domain/08-purple-team.md"]) if (!existsSync(resolve(root, file))) failures.push(`missing ${file}`);
const service = read("server/purple-team.ts");
for (const marker of ["Exercise Planning","Scenario Library","Detection Rule","Detection Gap","Improvement Track","simulationOnly: true","auditRequired: true","sigma","yara","lua","coveragePercent","meanTimeToDetectSeconds","dwellTimeSeconds"]) if (!service.includes(marker)) failures.push(`missing purple-team contract marker ${marker}`);
const rest = read("server/rest-v1-purple-team.ts");
for (const route of ["/api/v1/purpleteam/exercises","/api/v1/purpleteam/exercises/:id/run","/api/v1/purpleteam/exercises/:id/gap","/api/v1/purpleteam/exercises/:id/gap/improve","/api/v1/purpleteam/scenarios","/api/v1/purpleteam/detection-rules"]) if (!rest.includes(route)) failures.push(`missing REST route ${route}`);
const index = read("server/_core/index.ts"); if (!index.includes("registerPurpleTeamRestV1Routes")) failures.push("purple-team REST routes are not registered");
const test = read("server/purple-team.test.ts"); if (!test.includes("requires approval before execution")) failures.push("missing approval test");
if (failures.length) { console.error("Purple-team contract failed:"); failures.forEach(f => console.error(`- ${f}`)); process.exit(1); }
console.log("Purple-team contract OK: exercise planning, scenario library, detection rules, gap analysis, improvement tracking, metrics, REST API, and governed simulation.");
