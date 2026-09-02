import fs from "node:fs";
import path from "node:path";

const drizzleDir = path.join(process.cwd(), "drizzle");
const migrations = fs.readdirSync(drizzleDir).filter(file => /^\d{4}_.+\.sql$/.test(file)).sort();
const destructive = /(?:^|;)\s*(?:DROP\s+(?:TABLE|COLUMN|INDEX)|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/im;
const violations = [];
for (const file of migrations) {
  const sql = fs.readFileSync(path.join(drizzleDir, file), "utf8");
  if (destructive.test(sql) && !sql.includes("-- destructive-change-reviewed")) {
    violations.push(file);
  }
}
if (violations.length) {
  console.error(`Migration safety check failed: ${violations.join(", ")}`);
  console.error("Add -- destructive-change-reviewed with review evidence before merging destructive SQL.");
  process.exit(1);
}
console.log(`Migration safety check passed: ${migrations.length} migration files inspected.`);
