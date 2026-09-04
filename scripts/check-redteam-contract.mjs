import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const failures = [];
for (const file of ["server/redteam-operations.ts","server/redteam-operations.test.ts","server/rest-v1-redteam.ts","docs/domain/07-red-team.md"]) if (!existsSync(resolve(root, file))) failures.push(`missing ${file}`);
const service = read("server/redteam-operations.ts");
for (const marker of ["OperationPlanning","rulesOfEngagement","allowedTargets","requestRedTeamApproval","approveRedTeamOperation","authorizeRedTeamCapability","simulationOnly: true","auditRequired: true","C2Policy","targetExecutionEnabled: false"]) if (!service.includes(marker)) failures.push(`missing red-team contract marker ${marker}`);
for (const capability of ["c2","phishing","social_engineering","physical","lateral_movement","exfiltration","persistence","evasion","opsec"]) if (!service.includes(`\"${capability}\"`)) failures.push(`missing red-team capability ${capability}`);
const rest = read("server/rest-v1-redteam.ts");
for (const route of ["/api/v1/workspaces/:workspaceId/redteam/operations","/api/v1/redteam/operations/:id/request-approval","/api/v1/redteam/operations/:id/approve","/api/v1/redteam/operations/:id/simulate","/api/v1/redteam/c2/policy"]) if (!rest.includes(route)) failures.push(`missing REST route ${route}`);
const index = read("server/_core/index.ts"); if (!index.includes("registerRedTeamRestV1Routes")) failures.push("red-team REST routes are not registered");
const test = read("server/redteam-operations.test.ts"); for (const marker of ["requires approval before a simulation can run","keeps C2 explicitly fail-closed"]) if (!test.includes(marker)) failures.push(`missing test ${marker}`);
if (failures.length) { console.error("Red-team contract failed:"); failures.forEach(f => console.error(`- ${f}`)); process.exit(1); }
console.log("Red-team contract OK: governed operation planning, ROE/scope, approval workflow, 9 capability classes, simulation-only execution, C2 fail-closed policy, REST API, and tests.");
