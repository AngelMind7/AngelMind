import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const failures = [];
for (const file of ["server/governance-audit.ts", "server/rest-v1-governance.ts", "server/governance-audit.test.ts", "docs/domain/14-governance-audit.md"]) if (!existsSync(resolve(root, file))) failures.push(`missing ${file}`);
if (!failures.length) {
 const service = read("server/governance-audit.ts"); const rest = read("server/rest-v1-governance.ts"); const test = read("server/governance-audit.test.ts"); const docs = read("docs/domain/14-governance-audit.md");
 for (const marker of ["Policy Engine", "Approval Workflow", "Audit Log", "Compliance Mapping", "Data Retention", "Incident Response", "Risk Register", "Vendor Assessment"]) if (!service.includes(marker) && !docs.includes(marker)) failures.push(`missing governance capability ${marker}`);
 for (const marker of ["/api/v1/governance/policies", "/api/v1/governance/approvals", "/api/v1/audit/logs", "/api/v1/audit/integrity", "/api/v1/incidents"]) if (!rest.includes(marker)) failures.push(`missing route ${marker}`);
 for (const marker of ["compliance", "risk", "vendor"]) if (!test.includes(marker)) failures.push(`missing test coverage ${marker}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Governance & audit contract PASS");
