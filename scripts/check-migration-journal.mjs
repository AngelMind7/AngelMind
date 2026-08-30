import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const drizzleDir = path.join(root, "drizzle");
const journalPath = path.join(drizzleDir, "meta", "_journal.json");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
const sqlFiles = fs.readdirSync(drizzleDir)
  .filter(file => /^\d{4}_.+\.sql$/.test(file))
  .sort();
const entries = journal.entries ?? [];
const tags = new Set(entries.map(entry => entry.tag));
const missing = sqlFiles
  .map(file => file.replace(/\.sql$/, ""))
  .filter(tag => !tags.has(tag));
if (missing.length > 0 || entries.length !== sqlFiles.length) {
  console.error(JSON.stringify({ sqlFiles: sqlFiles.length, journalEntries: entries.length, missing }, null, 2));
  process.exit(1);
}
console.log(`Migration journal consistent: ${sqlFiles.length} SQL files / ${entries.length} journal entries.`);
