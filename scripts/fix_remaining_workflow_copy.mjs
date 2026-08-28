import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.resolve(import.meta.dirname, "../client/src/pages/Assurance.tsx");
let source = await readFile(file, "utf8");
source = source.replace('<option value="low">Low · 24h escalation</option><option value="medium">Medium · 8h escalation</option><option value="high">High · 2h escalation</option><option value="critical">Critical · 30m escalation</option>', '<option value="low">{copy("assurance.severityLow")}</option><option value="medium">{copy("assurance.severityMedium")}</option><option value="high">{copy("assurance.severityHigh")}</option><option value="critical">{copy("assurance.severityCritical")}</option>');
await writeFile(file, source);
console.log("Migrated remaining Assurance severity labels to explicit copy keys.");
