import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pages = ["Assurance.tsx", "Audit.tsx", "Governance.tsx", "Notifications.tsx", "Operations.tsx", "OperationsAdmin.tsx", "Workspaces.tsx"];
for (const page of pages) {
  const file = path.join(root, "client/src/pages", page);
  const source = await readFile(file, "utf8");
  const migrated = source.replace(/new Date\(([^)]+)\)\.toLocaleString\(\)/g, "<LocalizedDate value={$1} />");
  const withImport = migrated.includes("@/components/LocalizedDate") ? migrated : migrated.replace(/((?:import .*?;\n)+)/, "$1import { LocalizedDate } from \"@/components/LocalizedDate\";\n");
  await writeFile(file, withImport);
}
console.log(`Migrated locale-aware timestamps in ${pages.length} page components.`);
