import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationDir = path.join(root, "drizzle");
const runbookPath = path.join(root, "docs", "supabase-database-migration-runbook.md");
const migrations = fs.readdirSync(migrationDir).filter(file => /^\d{4}_.+\.sql$/.test(file)).sort();
if (!migrations.length) throw new Error("No migrations found.");
const runbook = fs.readFileSync(runbookPath, "utf8");
if (!/rollback/i.test(runbook) || !/backup/i.test(runbook) || !/staging/i.test(runbook)) {
  console.error("Migration rollback check failed: runbook must document backup, staging, and rollback.");
  process.exit(1);
}
const latest = migrations.at(-1);
const sql = fs.readFileSync(path.join(migrationDir, latest), "utf8");
const hasSchemaChange = /\b(?:ALTER\s+TABLE|CREATE\s+TABLE|CREATE\s+INDEX)\b/i.test(sql);
if (!hasSchemaChange) {
  console.error(`Migration rollback check failed: ${latest} has no recognized schema change.`);
  process.exit(1);
}
const destructive = /(?:^|;)\s*(?:DROP\s+(?:TABLE|COLUMN|INDEX)|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/im;
if (destructive.test(sql) && !sql.includes("-- destructive-change-reviewed")) {
  console.error(`Migration rollback check failed: ${latest} is destructive without review marker.`);
  process.exit(1);
}
console.log(`Migration rollback contract passed for ${latest}; live rollback remains an owner-approved deployment operation.`);
