import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.resolve(import.meta.dirname, "../client/src/pages/Assurance.tsx");
let source = await readFile(file, "utf8");
for (const panel of ["IncidentEvidencePanel", "PolicyPanel", "IncidentPanel", "WebhookActivationPanel"]) source = source.replace(`function ${panel}() { const { copy } = useLocale();`, `function ${panel}() { const { copy, t } = useLocale();`);
source = source.replaceAll('copy("common.link")', 't("common.link")').replaceAll('copy("common.approve")', 't("common.approve")').replaceAll('copy("common.reject")', 't("common.reject")').replaceAll('copy("common.resolve")', 't("common.resolve")');
await writeFile(file, source);
console.log("Corrected Assurance shared action-label translators.");
