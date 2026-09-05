import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const drizzleDir = resolve(root, "drizzle");
const migrations = readdirSync(drizzleDir)
  .filter(file => /^\d{4}_.+\.sql$/.test(file))
  .sort();
const migrationSql = migrations
  .map(file => readFileSync(resolve(drizzleDir, file), "utf8"))
  .join("\n");
const migrationWorkflow = readFileSync(
  resolve(root, ".github/workflows/migrate-database.yml"),
  "utf8"
);
const disasterRecoveryWorkflow = readFileSync(
  resolve(root, ".github/workflows/backup-and-restore.yml"),
  "utf8"
);

const schemaTables = [
  ...schema.matchAll(/\bmysqlTable\(\s*["']([^"']+)["']/g),
].map(match => match[1]);
const migratedTables = [
  ...migrationSql.matchAll(
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`([^`]+)`/gi
  ),
].map(match => match[1]);
const uniqueSchemaTables = [...new Set(schemaTables)];
const uniqueMigratedTables = new Set(migratedTables);
const failures = [];

for (const token of [
  "BACKUP-COMPLETED",
  "APPLY-MIGRATIONS",
  "concurrency:",
  "DATABASE_BACKUP_HOOK_URL",
  "pnpm drizzle-kit migrate",
  "check-migration-safety.mjs",
]) {
  if (!migrationWorkflow.includes(token))
    failures.push(`migration workflow missing safety gate: ${token}`);
}
for (const token of [
  "schedule:",
  "BACKUP_EXPORT_HOOK_URL",
  "BACKUP_EXPORT_HOOK_TOKEN",
  "retentionDays:35",
  "RESTORE_DRILL_HOOK_URL",
  "RESTORE-DRILL",
  "isolated-non-production-drill",
]) {
  if (!disasterRecoveryWorkflow.includes(token))
    failures.push(`disaster recovery workflow missing control: ${token}`);
}

if (uniqueSchemaTables.length < 74)
  failures.push(
    `schema tables: expected at least 74, found ${uniqueSchemaTables.length}`
  );
if (uniqueMigratedTables.size < 74)
  failures.push(
    `migrated tables: expected at least 74, found ${uniqueMigratedTables.size}`
  );
if (migrations.length < 64)
  failures.push(
    `migration files: expected at least 64, found ${migrations.length}`
  );
if (new Set(schemaTables).size !== schemaTables.length)
  failures.push("schema contains duplicate physical table declarations");

const missingMigrations = uniqueSchemaTables.filter(
  table => !uniqueMigratedTables.has(table)
);
if (missingMigrations.length)
  failures.push(
    `schema tables without CREATE TABLE migration: ${missingMigrations.join(", ")}`
  );

const requiredTables = [
  "users",
  "userProfiles",
  "authDevices",
  "apiKeys",
  "accountSecurityEvents",
  "mfaFactors",
  "mfaRecoveryCodes",
  "mfaChallenges",
  "organizations",
  "organizationMembers",
  "organizationInvitations",
  "programs",
  "organizationEntitlements",
  "workspaces",
  "workspaceMemberships",
  "researchSessions",
  "researchAssets",
  "researchObservations",
  "researchHypotheses",
  "researchTasks",
  "researchTaskDependencies",
  "failureObservations",
  "evolutionSnapshots",
  "intelligenceFeedItems",
  "findings",
  "findingRelations",
  "findingRetests",
  "findingComments",
  "evidenceArtifacts",
  "evidenceProvenance",
  "researchEvidenceLinks",
  "aiModels",
  "aiRuns",
  "aiRunOutputs",
  "aiRunEvaluations",
  "aiMemories",
  "promptVersions",
  "jobs",
  "idempotencyRecords",
  "outboxEvents",
  "outboxConsumerReceipts",
  "searchDocuments",
  "workspaceTags",
  "tagAssignments",
  "workspaceNotes",
  "savedViews",
  "runs",
  "playbooks",
  "playbookRuns",
  "approvals",
  "auditEvents",
  "auditArchives",
  "restoreDrillRuns",
  "policyVersions",
  "incidents",
  "incidentReviews",
  "notifications",
  "notificationPreferences",
  "notificationDeliveries",
  "webhookConfigurations",
  "webhookActivationRequests",
  "incidentEvidenceLinks",
  "submissions",
  "submissionEvents",
  "reportVersions",
  "reportDrafts",
  "knowledgeNodes",
  "knowledgeEdges",
  "passiveAssets",
  "credentialReferences",
  "workspaceChangeSnapshots",
  "emailDeliveries",
  "privacyRequests",
];
for (const table of requiredTables) {
  if (!uniqueSchemaTables.includes(table))
    failures.push(`missing required V4 table in schema: ${table}`);
  if (!uniqueMigratedTables.has(table))
    failures.push(`missing required V4 table migration: ${table}`);
}

if (failures.length) {
  console.error("Database contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Database contract OK: ${uniqueSchemaTables.length} schema tables, ${uniqueMigratedTables.size} migrated tables, ${migrations.length} migration files.`
);
