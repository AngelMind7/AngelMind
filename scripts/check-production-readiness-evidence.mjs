import fs from "node:fs";

const file = "docs/production-readiness-evidence.json";
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
if (manifest.decision !== "not-production-ready") throw new Error("Production evidence must remain not-production-ready until external gates are verified.");
const required = ["repositoryTests", "typecheck", "productionBuild", "migrationContracts", "selfContainedLab", "stagingDatabase", "stagingE2E", "productionDeployment", "productionBackupRestore", "externalProviders", "monitoringEscalation", "humanReleaseSignoff"];
const missing = required.filter(key => !manifest.gates?.[key]?.status || !manifest.gates?.[key]?.evidence);
if (missing.length) throw new Error(`Production evidence is missing required gates: ${missing.join(", ")}`);
const forbidden = ["production-ready", "live-deployed", "production-database-verified", "third-party-target-authorized"];
if (!forbidden.every(claim => manifest.prohibitedClaims?.includes(claim))) throw new Error("Production evidence must enumerate prohibited claims.");
const unresolved = Object.entries(manifest.gates).filter(([key, value]) => value.status !== "verified");
console.log(`PRODUCTION_READINESS_EVIDENCE_OK decision=${manifest.decision} verified=${Object.keys(manifest.gates).length - unresolved.length} unresolved=${unresolved.length}`);
console.log(`Unresolved gates: ${unresolved.map(([key, value]) => `${key}:${value.status}`).join(", ")}`);
