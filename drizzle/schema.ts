import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const workspaceStatus = ["active", "paused", "archived"] as const;
export const runStatus = ["queued", "running", "checkpointed", "completed", "blocked", "failed"] as const;
export const findingStatus = ["discovered", "triaged", "candidate", "reproducing", "validated", "reported", "submitted", "invalid", "duplicate", "inconclusive"] as const;
export const approvalStatus = ["pending", "approved", "rejected", "expired"] as const;
export const notificationEventType = ["approval_required", "guardrail_blocked", "finding_validated", "scheduled_check"] as const;
export const workspaceMemberRole = ["owner", "operator", "reviewer", "auditor"] as const;

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  programName: varchar("programName", { length: 160 }).notNull(),
  status: mysqlEnum("status", workspaceStatus).default("active").notNull(),
  safeHarbor: text("safeHarbor").notNull(),
  codeOfConduct: text("codeOfConduct").notNull(),
  allowlist: text("allowlist").notNull(),
  exclusions: text("exclusions").notNull(),
  budgetCents: int("budgetCents").default(0).notNull(),
  spentCents: int("spentCents").default(0).notNull(),
  sessionLimitMinutes: int("sessionLimitMinutes").default(240).notNull(),
  cooldownMinutes: int("cooldownMinutes").default(60).notNull(),
  retentionDays: int("retentionDays").default(30).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("workspaces_owner_status_idx").on(table.ownerUserId, table.status),
  uniqueIndex("workspaces_schedule_cron_task_uid_uq").on(table.scheduleCronTaskUid),
]);

export const runs = mysqlTable("runs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  mode: mysqlEnum("mode", ["dry_run", "administrative"] as const).notNull(),
  status: mysqlEnum("status", runStatus).notNull(),
  governanceTier: mysqlEnum("governanceTier", ["tier1", "tier2", "tier3"] as const).notNull(),
  plannedTaskCount: int("plannedTaskCount").default(0).notNull(),
  estimatedCostCents: int("estimatedCostCents").default(0).notNull(),
  estimatedDurationMinutes: int("estimatedDurationMinutes").default(0).notNull(),
  eventLog: text("eventLog").notNull(),
  checkpoint: text("checkpoint").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [index("runs_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const findings = mysqlTable("findings", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  fingerprint: varchar("fingerprint", { length: 96 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  status: mysqlEnum("status", findingStatus).default("discovered").notNull(),
  confidence: int("confidence").default(0).notNull(),
  impactSummary: text("impactSummary").notNull(),
  reportDraft: text("reportDraft").notNull(),
  humanReviewStatus: mysqlEnum("humanReviewStatus", ["pending", "approved", "rejected"] as const).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("findings_workspace_fingerprint_uq").on(table.workspaceId, table.fingerprint),
  index("findings_workspace_status_idx").on(table.workspaceId, table.status),
]);

export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  runId: int("runId"),
  actionName: varchar("actionName", { length: 160 }).notNull(),
  tier: mysqlEnum("tier", ["tier1", "tier2", "tier3"] as const).notNull(),
  status: mysqlEnum("status", approvalStatus).default("pending").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  decidedByUserId: int("decidedByUserId"),
  decisionNote: text("decisionNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt"),
}, table => [index("approvals_workspace_status_idx").on(table.workspaceId, table.status)]);

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  subject: varchar("subject", { length: 160 }).notNull(),
  evidenceHash: varchar("evidenceHash", { length: 64 }).notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("audit_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const evidenceArtifacts = mysqlTable("evidenceArtifacts", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  findingId: int("findingId"),
  artifactType: varchar("artifactType", { length: 80 }).notNull(),
  storageReference: text("storageReference").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("evidence_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const credentialReferences = mysqlTable("credentialReferences", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  secretReference: varchar("secretReference", { length: 200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("credential_workspace_label_uq").on(table.workspaceId, table.label),
  index("credential_workspace_idx").on(table.workspaceId),
]);

export const workspaceChangeSnapshots = mysqlTable("workspaceChangeSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  configurationDigest: varchar("configurationDigest", { length: 64 }).notNull(),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("change_snapshot_workspace_uq").on(table.workspaceId),
  index("change_snapshot_checked_idx").on(table.checkedAt),
]);

export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: mysqlEnum("eventType", notificationEventType).notNull(),
  inAppEnabled: int("inAppEnabled").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("notification_preference_user_event_uq").on(table.userId, table.eventType),
  index("notification_preference_user_idx").on(table.userId),
]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workspaceId: int("workspaceId"),
  eventType: mysqlEnum("eventType", notificationEventType).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"] as const).default("info").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("notifications_user_read_created_idx").on(table.userId, table.readAt, table.createdAt),
  index("notifications_workspace_created_idx").on(table.workspaceId, table.createdAt),
]);

export const workspaceMemberships = mysqlTable("workspaceMemberships", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", workspaceMemberRole).notNull(),
  addedByUserId: int("addedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("workspace_member_user_uq").on(table.workspaceId, table.userId),
  index("workspace_member_user_role_idx").on(table.userId, table.role),
]);

export const webhookConfigurations = mysqlTable("webhookConfigurations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  endpoint: varchar("endpoint", { length: 2_048 }).notNull(),
  signingSecretReference: varchar("signingSecretReference", { length: 240 }),
  eventTypes: text("eventTypes").notNull(),
  endpointConfirmed: int("endpointConfirmed").default(0).notNull(),
  enabled: int("enabled").default(0).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("webhook_workspace_uq").on(table.workspaceId)]);

export const auditArchives = mysqlTable("auditArchives", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageReference: text("storageReference").notNull(),
  manifestHash: varchar("manifestHash", { length: 64 }).notNull(),
  signature: varchar("signature", { length: 64 }).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("audit_archive_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export type Workspace = typeof workspaces.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
