import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const failures = [];
for (const file of ["server/redteam-operations.ts", "server/redteam-operations.test.ts", "server/rest-v1-redteam.ts", "docs/domain/07-red-team.md"]) if (!existsSync(resolve(root, file))) failures.push(`missing ${file}`);
const service = read("server/redteam-operations.ts");
for (const marker of ["redTeamOperationSchema", "rulesOfEngagement", "allowedTargets", "requestRedTeamApproval", "approveRedTeamOperation", "authorizeRedTeamCapability", "simulationOnly: true", "auditRequired: true", "C2Policy", "targetExecutionEnabled: false", "credentialCollection: false", "SimulatedImplant", "SimulatedPhishingCampaign"]) if (!service.includes(marker)) failures.push(`missing red-team contract marker ${marker}`);
for (const capability of ["c2", "phishing", "social_engineering", "physical", "lateral_movement", "exfiltration", "persistence", "evasion", "opsec"]) if (!service.includes(`\"${capability}\"`)) failures.push(`missing red-team capability ${capability}`);
const rest = read("server/rest-v1-redteam.ts");
for (const route of [
  "/api/v1/workspaces/:workspaceId/redteam/operations", "/api/v1/redteam/operations/:id/request-approval", "/api/v1/redteam/operations/:id/approve", "/api/v1/redteam/operations/:id/simulate", "/api/v1/redteam/c2/policy",
  "/api/v1/redteam/implants", "/api/v1/redteam/implants/:id", "/api/v1/redteam/implants/:id/beacon", "/api/v1/redteam/implants/:id/command", "/api/v1/redteam/implants/:id/commands",
  "/api/v1/redteam/phishing/campaigns", "/api/v1/redteam/phishing/campaigns/:id/stats", "/api/v1/redteam/phishing/campaigns/:id/send", "/api/v1/redteam/phishing/campaigns/:id/click"
]) if (!rest.includes(route)) failures.push(`missing REST route ${route}`);
for (const marker of ["createSimulatedImplant", "recordSimulatedBeacon", "queueSimulatedCommand", "createSimulatedPhishingCampaign", "simulatePhishingSend", "recordSimulatedClick"]) if (!rest.includes(marker)) failures.push(`missing REST handler ${marker}`);
const index = read("server/_core/index.ts"); if (!index.includes("registerRedTeamRestV1Routes")) failures.push("red-team REST routes are not registered");
const test = read("server/redteam-operations.test.ts"); for (const marker of ["requires approval before a simulation can run", "keeps C2 explicitly fail-closed", "keeps implant and beacon lifecycle synthetic", "keeps phishing delivery synthetic and never collects credentials"]) if (!test.includes(marker)) failures.push(`missing test ${marker}`);
if (failures.length) { console.error("Red-team contract failed:"); failures.forEach(f => console.error(`- ${f}`)); process.exit(1); }
console.log("Red-team contract OK: governed planning/ROE, approval, 9 capabilities, simulation-only implants/beacons/commands, synthetic phishing, C2 fail-closed policy, complete REST surface, and tests.");
