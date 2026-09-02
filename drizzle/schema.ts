import { foreignKey, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  /** Firebase UID namespace (`firebase:<uid>`). Unique per user. */
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

export const accountSecurityEventType = ["login", "logout", "token_rejected", "password_reset_requested", "mfa_enrolled", "mfa_unenrolled", "device_registered", "device_revoked", "profile_updated", "privacy_export_requested", "privacy_export_completed", "privacy_delete_requested", "privacy_delete_completed", "privacy_delete_blocked"] as const;
export const profileVisibility = ["private", "organization", "public"] as const;
export const apiKeyStatus = ["active", "revoked", "expired"] as const;
export const entitlementPlan = ["free", "team", "enterprise"] as const;
export const privacyRequestType = ["export", "delete", "rectify"] as const;
export const privacyRequestStatus = ["requested", "processing", "completed", "rejected"] as const;
export const authDevicePlatform = ["web", "ios", "android", "unknown"] as const;
export const onboardingStatus = ["not_started", "in_progress", "completed", "skipped"] as const;

export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 64 }),
  avatarReference: varchar("avatarReference", { length: 512 }),
  bio: text("bio").notNull(),
  specialization: varchar("specialization", { length: 160 }),
  skills: text("skills").notNull(),
  experience: text("experience").notNull(),
  visibility: mysqlEnum("visibility", profileVisibility).default("organization").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("user_profile_user_uq").on(table.userId), uniqueIndex("user_profile_username_uq").on(table.username), index("user_profile_visibility_idx").on(table.visibility, table.updatedAt)]);

export const authDevices = mysqlTable("authDevices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  platform: mysqlEnum("platform", authDevicePlatform).default("unknown").notNull(),
  userAgent: varchar("userAgent", { length: 512 }),
  lastIpHash: varchar("lastIpHash", { length: 128 }),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  trusted: int("trusted").default(1).notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("auth_device_user_fingerprint_uq").on(table.userId, table.deviceFingerprint),
  index("auth_device_user_last_seen_idx").on(table.userId, table.lastSeenAt),
]);

export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workspaceId: int("workspaceId").references(() => workspaces.id, { onDelete: "set null" }),
  name: varchar("name", { length: 120 }).notNull(),
  prefix: varchar("prefix", { length: 16 }).notNull(),
  secretHash: varchar("secretHash", { length: 64 }).notNull(),
  scopes: text("scopes").notNull(),
  status: mysqlEnum("status", apiKeyStatus).default("active").notNull(),
  expiresAt: timestamp("expiresAt"),
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("api_key_secret_hash_uq").on(table.secretHash), index("api_key_user_status_idx").on(table.userId, table.status), index("api_key_workspace_status_idx").on(table.workspaceId, table.status)]);

export const accountSecurityEvents = mysqlTable("accountSecurityEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: mysqlEnum("eventType", accountSecurityEventType).notNull(),
  deviceId: int("deviceId"),
  ipHash: varchar("ipHash", { length: 128 }),
  userAgent: varchar("userAgent", { length: 512 }),
  metadata: text("metadata").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("account_security_event_user_created_idx").on(table.userId, table.createdAt),
  index("account_security_event_type_created_idx").on(table.eventType, table.createdAt),
]);

export const onboardingProfiles = mysqlTable("onboardingProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", onboardingStatus).default("not_started").notNull(),
  currentStep: varchar("currentStep", { length: 64 }).default("profile").notNull(),
  organizationName: varchar("organizationName", { length: 160 }),
  roleIntent: varchar("roleIntent", { length: 80 }),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("onboarding_profile_user_uq").on(table.userId)]);

export const organizationStatus = ["active", "suspended", "archived"] as const;
export const organizationMemberRole = ["owner", "admin", "researcher", "reviewer", "auditor"] as const;
export const programStatus = ["draft", "active", "paused", "completed", "archived"] as const;

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  status: mysqlEnum("status", organizationStatus).default("active").notNull(),
  settings: text("settings").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("organization_slug_uq").on(table.slug), index("organization_owner_status_idx").on(table.ownerUserId, table.status)]);

export const organizationMembers = mysqlTable("organizationMembers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", organizationMemberRole).default("researcher").notNull(),
  invitedByUserId: int("invitedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("organization_member_uq").on(table.organizationId, table.userId), index("organization_member_user_idx").on(table.userId, table.role)]);
export const invitationStatus = ["pending", "accepted", "expired", "revoked"] as const;
export const organizationInvitations = mysqlTable("organizationInvitations", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "researcher", "reviewer", "auditor"] as const).notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  status: mysqlEnum("status", invitationStatus).default("pending").notNull(),
  invitedByUserId: int("invitedByUserId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedByUserId: int("acceptedByUserId"),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("organization_invite_token_uq").on(table.tokenHash), index("organization_invite_status_idx").on(table.organizationId, table.status), index("organization_invite_email_idx").on(table.email, table.status)]);

export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", programStatus).default("draft").notNull(),
  authorizationReference: text("authorizationReference"),
  includedAssets: text("includedAssets").notNull(),
  excludedAssets: text("excludedAssets").notNull(),
  rules: text("rules").notNull(),
  safeHarbor: text("safeHarbor").notNull(),
  currentVersion: int("currentVersion").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("program_organization_status_idx").on(table.organizationId, table.status), uniqueIndex("program_organization_name_uq").on(table.organizationId, table.name)]);

export const organizationEntitlements = mysqlTable("organizationEntitlements", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  plan: mysqlEnum("plan", entitlementPlan).default("free").notNull(),
  featureFlags: text("featureFlags").notNull(),
  limits: text("limits").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("organization_entitlement_uq").on(table.organizationId), index("organization_entitlement_period_idx").on(table.periodEnd)]);

export const emailDeliveryStatus = ["queued", "sending", "sent", "failed"] as const;

export const emailDeliveries = mysqlTable("emailDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  workspaceId: int("workspaceId"),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  templateKey: varchar("templateKey", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  payload: text("payload").notNull(),
  status: mysqlEnum("status", emailDeliveryStatus).default("queued").notNull(),
  attempts: int("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
  providerMessageId: varchar("providerMessageId", { length: 512 }),
  lastError: text("lastError"),
  idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("email_delivery_idempotency_uq").on(table.idempotencyKey), index("email_delivery_status_attempt_idx").on(table.status, table.nextAttemptAt), index("email_delivery_recipient_idx").on(table.recipient)]);

export const privacyRequests = mysqlTable("privacyRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  requestType: mysqlEnum("requestType", privacyRequestType).notNull(),
  status: mysqlEnum("status", privacyRequestStatus).default("requested").notNull(),
  reason: text("reason").notNull(),
  resultReference: varchar("resultReference", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [index("privacy_request_user_status_idx").on(table.userId, table.status), index("privacy_request_created_idx").on(table.createdAt)]);

export const workspaceStatus = ["active", "paused", "archived"] as const;
export const runStatus = ["queued", "running", "checkpointed", "completed", "blocked", "failed"] as const;
export const findingStatus = ["discovered", "triaged", "candidate", "reproducing", "validated", "reported", "notified", "remediation", "retest", "resolved", "reopened", "false_positive", "submitted", "invalid", "duplicate", "inconclusive"] as const;
export const findingSeverity = ["informational", "low", "medium", "high", "critical"] as const;
export const approvalStatus = ["pending", "approved", "rejected", "expired"] as const;
export const notificationEventType = ["approval_required", "guardrail_blocked", "finding_validated", "scheduled_check", "policy_review_required", "incident_created", "webhook_activation_requested", "comment_mentioned"] as const;
export const workspaceMemberRole = ["owner", "operator", "reviewer", "auditor", "approval_authority"] as const;
export const policyVersionStatus = ["pending", "approved", "rejected", "superseded"] as const;
export const incidentSeverity = ["low", "medium", "high", "critical"] as const;
export const incidentStatus = ["open", "acknowledged", "resolved"] as const;

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  organizationId: int("organizationId"),
  programId: int("programId"),
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
  scheduleCron: varchar("scheduleCron", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("workspaces_owner_status_idx").on(table.ownerUserId, table.status),
  uniqueIndex("workspaces_schedule_cron_task_uid_uq").on(table.scheduleCronTaskUid),
]);

export const researchSessionState = ["draft", "ready", "active", "paused", "completed", "archived"] as const;
export const researchAssetType = ["domain", "subdomain", "ip", "application", "api", "endpoint", "technology", "service"] as const;
export const researchAssetState = ["discovered", "triaged", "in_scope", "out_of_scope", "archived"] as const;
export const researchTaskStatus = ["queued", "running", "blocked", "paused", "failed", "retrying", "completed", "cancelled"] as const;
export const researchTaskRiskClass = ["low", "medium", "high", "critical"] as const;
export const researchObservationStatus = ["new", "reviewed", "linked", "archived"] as const;
export const researchHypothesisStatus = ["proposed", "investigating", "supported", "disproven", "validated", "archived"] as const;

export const researchSessions = mysqlTable("researchSessions", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  ownerUserId: int("ownerUserId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  state: mysqlEnum("state", researchSessionState).default("draft").notNull(),
  revision: int("revision").default(0).notNull(),
  scopeDigest: varchar("scopeDigest", { length: 128 }).notNull(),
  traceId: varchar("traceId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [index("research_session_id_workspace_idx").on(table.id, table.workspaceId), index("research_session_workspace_state_idx").on(table.workspaceId, table.state), index("research_session_owner_updated_idx").on(table.ownerUserId, table.updatedAt)]);

export const researchAssets = mysqlTable("researchAssets", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => researchSessions.id, { onDelete: "cascade" }),
  assetType: mysqlEnum("assetType", researchAssetType).notNull(),
  value: varchar("value", { length: 512 }).notNull(),
  hostname: varchar("hostname", { length: 255 }),
  state: mysqlEnum("state", researchAssetState).default("discovered").notNull(),
  inScope: int("inScope").default(0).notNull(),
  metadata: text("metadata").notNull(),
  traceId: varchar("traceId", { length: 128 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("research_asset_id_workspace_idx").on(table.id, table.workspaceId), index("research_asset_session_state_idx").on(table.sessionId, table.state), uniqueIndex("research_asset_session_value_uq").on(table.sessionId, table.value), foreignKey({ columns: [table.sessionId, table.workspaceId], foreignColumns: [researchSessions.id, researchSessions.workspaceId], name: "research_asset_session_workspace_fk" })]);

export const researchObservations = mysqlTable("researchObservations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => researchSessions.id, { onDelete: "cascade" }),
  assetId: int("assetId").references(() => researchAssets.id, { onDelete: "set null" }),
  title: varchar("title", { length: 240 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", researchObservationStatus).default("new").notNull(),
  traceId: varchar("traceId", { length: 128 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("research_observation_id_workspace_idx").on(table.id, table.workspaceId), index("research_observation_session_created_idx").on(table.sessionId, table.createdAt), index("research_observation_asset_idx").on(table.assetId), foreignKey({ columns: [table.sessionId, table.workspaceId], foreignColumns: [researchSessions.id, researchSessions.workspaceId], name: "research_observation_session_workspace_fk" })]);

export const researchHypotheses = mysqlTable("researchHypotheses", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => researchSessions.id, { onDelete: "cascade" }),
  assetId: int("assetId").references(() => researchAssets.id, { onDelete: "set null" }),
  observationId: int("observationId").references(() => researchObservations.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  reason: text("reason").notNull(),
  priority: int("priority").default(50).notNull(),
  status: mysqlEnum("status", researchHypothesisStatus).default("proposed").notNull(),
  evidence: text("evidence").notNull(),
  aiAnalysis: text("aiAnalysis"),
  outcome: text("outcome"),
  traceId: varchar("traceId", { length: 128 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("research_hypothesis_session_status_idx").on(table.sessionId, table.status), index("research_hypothesis_observation_idx").on(table.observationId), foreignKey({ columns: [table.sessionId, table.workspaceId], foreignColumns: [researchSessions.id, researchSessions.workspaceId], name: "research_hypothesis_session_workspace_fk" })]);

export const researchTasks = mysqlTable("researchTasks", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => researchSessions.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  priority: int("priority").default(50).notNull(),
  status: mysqlEnum("status", researchTaskStatus).default("queued").notNull(),
  riskClass: mysqlEnum("riskClass", researchTaskRiskClass).default("low").notNull(),
  approvalStatus: mysqlEnum("approvalStatus", approvalStatus).default("approved").notNull(),
  vectorKey: varchar("vectorKey", { length: 160 }),
  requiredCapabilities: text("requiredCapabilities").notNull(),
  suggestedAdapters: text("suggestedAdapters").notNull(),
  approvalId: int("approvalId"),
  revision: int("revision").default(0).notNull(),
  ownerUserId: int("ownerUserId"),
  dependencies: text("dependencies").notNull(),
  inputs: text("inputs").notNull(),
  outputs: text("outputs").notNull(),
  retryCount: int("retryCount").default(0).notNull(),
  traceId: varchar("traceId", { length: 128 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("research_task_session_status_priority_idx").on(table.sessionId, table.status, table.priority), index("research_task_owner_status_idx").on(table.ownerUserId, table.status), index("research_task_approval_status_idx").on(table.workspaceId, table.approvalStatus, table.riskClass), foreignKey({ columns: [table.sessionId, table.workspaceId], foreignColumns: [researchSessions.id, researchSessions.workspaceId], name: "research_task_session_workspace_fk" })]);

export const researchTaskDependencies = mysqlTable("researchTaskDependencies", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  taskId: int("taskId").notNull().references(() => researchTasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: int("dependsOnTaskId").notNull().references(() => researchTasks.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("research_task_dependency_pair_uq").on(table.taskId, table.dependsOnTaskId), index("research_task_dependency_workspace_idx").on(table.workspaceId, table.createdAt), index("research_task_dependency_parent_idx").on(table.dependsOnTaskId)]);

export const failureKind = ["timeout", "dependency_failure", "partial_response", "error_state", "recovery_behavior", "retry_behavior", "concurrency", "race_condition", "transaction_failure", "degraded_mode", "cascading_failure"] as const;
export const failureImpact = ["none", "low", "medium", "high", "critical"] as const;
export const failureObservationStatus = ["observed", "triaged", "validated", "archived"] as const;

export const failureObservations = mysqlTable("failureObservations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => researchSessions.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", failureKind).notNull(),
  normalState: varchar("normalState", { length: 240 }).notNull(),
  condition: text("condition").notNull(),
  observedBehavior: text("observedBehavior").notNull(),
  impact: mysqlEnum("impact", failureImpact).default("low").notNull(),
  evidenceRefs: text("evidenceRefs").notNull(),
  status: mysqlEnum("status", failureObservationStatus).default("observed").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("failure_observation_workspace_status_idx").on(table.workspaceId, table.status), index("failure_observation_session_created_idx").on(table.sessionId, table.createdAt)]);

export const evolutionSnapshots = mysqlTable("evolutionSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").references(() => researchSessions.id, { onDelete: "set null" }),
  assetRef: varchar("assetRef", { length: 512 }).notNull(),
  version: varchar("version", { length: 120 }).notNull(),
  capturedAt: timestamp("capturedAt").notNull(),
  attributes: text("attributes").notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("evolution_snapshot_workspace_asset_idx").on(table.workspaceId, table.assetRef, table.capturedAt)]);

export const intelligenceFeedItems = mysqlTable("intelligenceFeedItems", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 120 }).notNull(),
  assetRef: varchar("assetRef", { length: 512 }).notNull(),
  observedAt: timestamp("observedAt").notNull(),
  confidence: int("confidence").notNull(),
  reference: varchar("reference", { length: 512 }),
  dedupeKey: varchar("dedupeKey", { length: 64 }).notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("intelligence_feed_workspace_dedupe_uq").on(table.workspaceId, table.dedupeKey), index("intelligence_feed_workspace_asset_idx").on(table.workspaceId, table.assetRef, table.observedAt), index("intelligence_feed_source_idx").on(table.source, table.observedAt)]);

export const playbookStatus = ["draft", "active", "deprecated"] as const;
export const playbooks = mysqlTable("playbooks", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 160 }).notNull(),
  version: varchar("version", { length: 40 }).notNull(),
  status: mysqlEnum("status", playbookStatus).default("draft").notNull(),
  domains: text("domains").notNull(),
  assetTypes: text("assetTypes").notNull(),
  technologies: text("technologies").notNull(),
  taskTemplates: text("taskTemplates").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("playbook_workspace_slug_version_uq").on(table.workspaceId, table.slug, table.version), index("playbook_workspace_status_idx").on(table.workspaceId, table.status)]);
export const playbookRunStatus = ["queued", "running", "paused", "failed", "completed", "cancelled"] as const;
export const playbookRuns = mysqlTable("playbookRuns", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  playbookId: int("playbookId").notNull().references(() => playbooks.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => researchSessions.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", playbookRunStatus).default("queued").notNull(),
  taskIds: text("taskIds").notNull(),
  checkpoint: text("checkpoint").notNull(),
  retryCount: int("retryCount").default(0).notNull(),
  lastError: text("lastError"),
  createdByUserId: int("createdByUserId").notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("playbook_run_workspace_status_idx").on(table.workspaceId, table.status, table.updatedAt), index("playbook_run_session_idx").on(table.sessionId, table.createdAt)]);
export const aiModelStatus = ["active", "degraded", "disabled"] as const;
export const aiRunStatus = ["queued", "running", "completed", "failed", "partial", "cancelled"] as const;
export const jobStatus = ["queued", "running", "succeeded", "failed", "retrying", "dead_letter", "cancelled"] as const;
export const outboxEventStatus = ["pending", "retrying", "published", "failed"] as const;

export const aiModels = mysqlTable("aiModels", {
  id: int("id").autoincrement().primaryKey(),
  modelKey: varchar("modelKey", { length: 160 }).notNull(),
  provider: varchar("provider", { length: 120 }).notNull(),
  gateway: varchar("gateway", { length: 120 }).notNull(),
  capabilities: text("capabilities").notNull(),
  contextWindow: int("contextWindow").default(0).notNull(),
  status: mysqlEnum("status", aiModelStatus).default("active").notNull(),
  version: varchar("version", { length: 80 }),
  inputCostPerMillionCents: int("inputCostPerMillionCents").default(0).notNull(),
  outputCostPerMillionCents: int("outputCostPerMillionCents").default(0).notNull(),
  lastHealthCheckAt: timestamp("lastHealthCheckAt"),
  lastLatencyMs: int("lastLatencyMs"),
  lastErrorCode: varchar("lastErrorCode", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("ai_model_key_uq").on(table.modelKey), index("ai_model_status_idx").on(table.status, table.updatedAt)]);

export const aiRuns = mysqlTable("aiRuns", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").references(() => researchSessions.id, { onDelete: "set null" }),
  taskId: int("taskId").references(() => researchTasks.id, { onDelete: "set null" }),
  userId: int("userId").notNull(),
  modelKey: varchar("modelKey", { length: 160 }).notNull(),
  gateway: varchar("gateway", { length: 120 }).notNull(),
  purpose: varchar("purpose", { length: 120 }).notNull(),
  traceId: varchar("traceId", { length: 128 }).notNull(),
  inputReference: varchar("inputReference", { length: 512 }).notNull(),
  outputReference: varchar("outputReference", { length: 512 }),
  status: mysqlEnum("status", aiRunStatus).default("queued").notNull(),
  inputTokens: int("inputTokens").default(0).notNull(),
  outputTokens: int("outputTokens").default(0).notNull(),
  costCents: int("costCents").default(0).notNull(),
  errorCode: varchar("errorCode", { length: 120 }),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  retentionUntil: timestamp("retentionUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("ai_run_workspace_created_idx").on(table.workspaceId, table.createdAt), index("ai_run_trace_idx").on(table.traceId), index("ai_run_status_idx").on(table.status, table.createdAt), index("ai_run_retention_id_idx").on(table.retentionUntil, table.id)]);

export const aiRunOutputs = mysqlTable("aiRunOutputs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  runId: int("runId").notNull().references(() => aiRuns.id, { onDelete: "cascade" }),
  outputJson: text("outputJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("ai_run_output_run_uq").on(table.runId), index("ai_run_output_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const aiEvaluationVerdict = ["pass", "fail", "needs_review"] as const;

export const aiRunEvaluations = mysqlTable("aiRunEvaluations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  runId: int("runId").notNull().references(() => aiRuns.id, { onDelete: "cascade" }),
  rubric: varchar("rubric", { length: 160 }).notNull(),
  score: int("score").notNull(),
  verdict: mysqlEnum("verdict", aiEvaluationVerdict).notNull(),
  notes: text("notes").notNull(),
  evaluatedByUserId: int("evaluatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("ai_run_evaluation_rubric_uq").on(table.runId, table.rubric), index("ai_evaluation_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const promptVersions = mysqlTable("promptVersions", {
  id: int("id").autoincrement().primaryKey(),
  purpose: varchar("purpose", { length: 120 }).notNull(),
  version: int("version").notNull(),
  template: text("template").notNull(),
  variables: text("variables").notNull(),
  compatibleModels: text("compatibleModels").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("prompt_purpose_version_uq").on(table.purpose, table.version), index("prompt_purpose_created_idx").on(table.purpose, table.createdAt)]);

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").references(() => workspaces.id, { onDelete: "set null" }),
  kind: varchar("kind", { length: 80 }).notNull(),
  traceId: varchar("traceId", { length: 128 }),
  idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
  payload: text("payload").notNull(),
  status: mysqlEnum("status", jobStatus).default("queued").notNull(),
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  availableAt: timestamp("availableAt").defaultNow().notNull(),
  lockedAt: timestamp("lockedAt"),
  leaseExpiresAt: timestamp("leaseExpiresAt"),
  heartbeatAt: timestamp("heartbeatAt"),
  workerId: varchar("workerId", { length: 128 }),
  lastError: text("lastError"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("job_idempotency_key_uq").on(table.idempotencyKey), index("job_status_available_idx").on(table.status, table.availableAt), index("job_lease_expiry_idx").on(table.status, table.leaseExpiresAt), index("job_workspace_created_idx").on(table.workspaceId, table.createdAt), index("job_trace_idx").on(table.traceId)]);

export const outboxEvents = mysqlTable("outboxEvents", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").references(() => workspaces.id, { onDelete: "set null" }),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  traceId: varchar("traceId", { length: 128 }),
  aggregateType: varchar("aggregateType", { length: 80 }).notNull(),
  aggregateId: int("aggregateId").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
  schemaVersion: int("schemaVersion").default(1).notNull(),
  payload: text("payload").notNull(),
  status: mysqlEnum("status", outboxEventStatus).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  availableAt: timestamp("availableAt").defaultNow().notNull(),
  lockedAt: timestamp("lockedAt"),
  workerId: varchar("workerId", { length: 128 }),
  lastError: text("lastError"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("outbox_event_idempotency_uq").on(table.idempotencyKey), index("outbox_event_status_created_idx").on(table.status, table.createdAt), index("outbox_event_workspace_idx").on(table.workspaceId, table.createdAt), index("outbox_event_trace_idx").on(table.traceId)]);

export const outboxConsumerReceipts = mysqlTable("outboxConsumerReceipts", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull().references(() => outboxEvents.id, { onDelete: "cascade" }),
  consumerKey: varchar("consumerKey", { length: 160 }).notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
  resultHash: varchar("resultHash", { length: 64 }),
}, table => [uniqueIndex("outbox_consumer_event_uq").on(table.eventId, table.consumerKey), index("outbox_consumer_processed_idx").on(table.consumerKey, table.processedAt)]);

export const searchDocuments = mysqlTable("searchDocuments", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  entityType: varchar("entityType", { length: 60 }).notNull(),
  entityId: int("entityId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("search_document_entity_uq").on(table.workspaceId, table.entityType, table.entityId), index("search_document_workspace_updated_idx").on(table.workspaceId, table.updatedAt)]);

export const workspaceTags = mysqlTable("workspaceTags", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  color: varchar("color", { length: 16 }).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("workspace_tag_name_uq").on(table.workspaceId, table.name), index("workspace_tag_workspace_idx").on(table.workspaceId, table.createdAt)]);
export const tagAssignments = mysqlTable("tagAssignments", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  tagId: int("tagId").notNull().references(() => workspaceTags.id, { onDelete: "cascade" }),
  entityType: varchar("entityType", { length: 60 }).notNull(),
  entityId: int("entityId").notNull(),
  assignedByUserId: int("assignedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("tag_assignment_entity_uq").on(table.tagId, table.entityType, table.entityId), index("tag_assignment_entity_idx").on(table.workspaceId, table.entityType, table.entityId)]);
export const workspaceNotes = mysqlTable("workspaceNotes", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  authorUserId: int("authorUserId").notNull(),
  entityType: varchar("entityType", { length: 60 }).notNull(),
  entityId: int("entityId"),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  visibility: mysqlEnum("visibility", ["private", "workspace"] as const).default("workspace").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("workspace_note_entity_idx").on(table.workspaceId, table.entityType, table.entityId), index("workspace_note_author_updated_idx").on(table.authorUserId, table.updatedAt)]);

export const savedViews = mysqlTable("savedViews", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  query: varchar("query", { length: 512 }).notNull(),
  filters: text("filters").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("saved_view_workspace_user_name_uq").on(table.workspaceId, table.userId, table.name), index("saved_view_workspace_user_updated_idx").on(table.workspaceId, table.updatedAt)]);

export const runs = mysqlTable("runs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
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
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  fingerprint: varchar("fingerprint", { length: 96 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  severity: mysqlEnum("severity", findingSeverity).default("medium").notNull(),
  status: mysqlEnum("status", findingStatus).default("discovered").notNull(),
  revision: int("revision").default(0).notNull(),
  confidence: int("confidence").default(0).notNull(),
  impactSummary: text("impactSummary").notNull(),
  reportDraft: text("reportDraft").notNull(),
  sourceObservationId: int("sourceObservationId"),
  humanReviewStatus: mysqlEnum("humanReviewStatus", ["pending", "approved", "rejected"] as const).default("pending").notNull(),
  clientNotifiedAt: timestamp("clientNotifiedAt"),
  remediationDeadline: timestamp("remediationDeadline"),
  remediationOwnerUserId: int("remediationOwnerUserId"),
  remediationNotes: text("remediationNotes"),
  resolvedAt: timestamp("resolvedAt"),
  traceId: varchar("traceId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("findings_workspace_fingerprint_uq").on(table.workspaceId, table.fingerprint),
  index("findings_workspace_status_idx").on(table.workspaceId, table.status),
  index("findings_source_observation_idx").on(table.sourceObservationId),
  index("findings_workspace_remediation_idx").on(table.workspaceId, table.remediationDeadline),
  index("findings_remediation_owner_status_idx").on(table.remediationOwnerUserId, table.status),
]);

export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  runId: int("runId"),
  /** Structured review context: target, tool, risk class, scope digest, and expected impact. */
  contextJson: text("contextJson"),
  actionName: varchar("actionName", { length: 160 }).notNull(),
  tier: mysqlEnum("tier", ["tier1", "tier2", "tier3"] as const).notNull(),
  status: mysqlEnum("status", approvalStatus).default("pending").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  decidedByUserId: int("decidedByUserId"),
  decisionNote: text("decisionNote"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt"),
}, table => [index("approvals_workspace_status_idx").on(table.workspaceId, table.status), index("approvals_expiry_idx").on(table.status, table.expiresAt)]);

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 80 }).notNull(),
  subject: varchar("subject", { length: 160 }).notNull(),
  evidenceHash: varchar("evidenceHash", { length: 64 }).notNull(),
  previousEntryHash: varchar("previousEntryHash", { length: 64 }),
  chainHash: varchar("chainHash", { length: 64 }),
  traceId: varchar("traceId", { length: 128 }),
  details: text("details").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("audit_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const evidenceArtifactStatus = ["quarantined", "scanned", "promoted", "rejected"] as const;

export const evidenceArtifacts = mysqlTable("evidenceArtifacts", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  findingId: int("findingId").references(() => findings.id, { onDelete: "set null" }),
  artifactType: varchar("artifactType", { length: 80 }).notNull(),
  /** Stable Supabase object key; signed URLs are minted only when needed. */
  storageKey: varchar("storageKey", { length: 512 }),
  /** Legacy/reference field retained for API compatibility. New rows store the stable key here. */
  storageReference: text("storageReference").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  status: mysqlEnum("status", evidenceArtifactStatus).default("quarantined").notNull(),
  contentType: varchar("contentType", { length: 160 }),
  sizeBytes: int("sizeBytes").default(0).notNull(),
  quarantineReason: text("quarantineReason"),
  traceId: varchar("traceId", { length: 128 }),
  scannedAt: timestamp("scannedAt"),
  promotedAt: timestamp("promotedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("evidence_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const evidenceProvenance = mysqlTable("evidenceProvenance", {
  id: int("id").autoincrement().primaryKey(),
  evidenceArtifactId: int("evidenceArtifactId").notNull().references(() => evidenceArtifacts.id, { onDelete: "cascade" }),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sourceType: varchar("sourceType", { length: 64 }).notNull(),
  sourceReference: varchar("sourceReference", { length: 512 }).notNull(),
  capturedAt: timestamp("capturedAt").notNull(),
  capturedByUserId: int("capturedByUserId").notNull(),
  metadata: text("metadata").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("evidence_provenance_workspace_idx").on(table.workspaceId, table.createdAt), index("evidence_provenance_artifact_created_idx").on(table.evidenceArtifactId, table.createdAt)]);

export const researchEvidenceLinks = mysqlTable("researchEvidenceLinks", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  evidenceArtifactId: int("evidenceArtifactId").notNull().references(() => evidenceArtifacts.id, { onDelete: "cascade" }),
  observationId: int("observationId").references(() => researchObservations.id, { onDelete: "set null" }),
  hypothesisId: int("hypothesisId").references(() => researchHypotheses.id, { onDelete: "set null" }),
  linkType: varchar("linkType", { length: 40 }).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("research_evidence_link_workspace_idx").on(table.workspaceId, table.createdAt), index("research_evidence_link_artifact_idx").on(table.evidenceArtifactId), index("research_evidence_link_observation_idx").on(table.observationId), index("research_evidence_link_hypothesis_idx").on(table.hypothesisId)]);

export const findingRelations = mysqlTable("findingRelations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  findingId: int("findingId").notNull().references(() => findings.id, { onDelete: "cascade" }),
  relatedFindingId: int("relatedFindingId").notNull().references(() => findings.id, { onDelete: "cascade" }),
  relationType: mysqlEnum("relationType", ["duplicate", "related", "supersedes"] as const).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("finding_relation_pair_uq").on(table.findingId, table.relatedFindingId, table.relationType), index("finding_relation_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const findingRetests = mysqlTable("findingRetests", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  findingId: int("findingId").notNull().references(() => findings.id, { onDelete: "cascade" }),
  requestedByUserId: int("requestedByUserId").notNull(),
  status: mysqlEnum("status", ["requested", "in_progress", "passed", "failed", "inconclusive", "cancelled"] as const).default("requested").notNull(),
  scopeDigest: varchar("scopeDigest", { length: 128 }).notNull(),
  resultSummary: text("resultSummary"),
  evidenceArtifactId: int("evidenceArtifactId").references(() => evidenceArtifacts.id, { onDelete: "set null" }),
  reviewedByUserId: int("reviewedByUserId"),
  startedAt: timestamp("startedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [index("finding_retest_workspace_status_idx").on(table.workspaceId, table.status), index("finding_retest_finding_created_idx").on(table.findingId, table.createdAt)]);

export const credentialReferences = mysqlTable("credentialReferences", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 120 }).notNull(),
  secretReference: varchar("secretReference", { length: 200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("credential_workspace_label_uq").on(table.workspaceId, table.label),
  index("credential_workspace_idx").on(table.workspaceId),
]);

export const workspaceChangeSnapshots = mysqlTable("workspaceChangeSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
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

export const notificationDeliveryChannel = ["in_app", "email", "webhook"] as const;
export const notificationDeliveryStatus = ["queued", "sending", "sent", "failed", "disabled"] as const;
export const notificationDeliveries = mysqlTable("notificationDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  notificationId: int("notificationId").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  userId: int("userId").notNull(),
  workspaceId: int("workspaceId").references(() => workspaces.id, { onDelete: "set null" }),
  channel: mysqlEnum("channel", notificationDeliveryChannel).notNull(),
  status: mysqlEnum("status", notificationDeliveryStatus).default("queued").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
  attempts: int("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("nextAttemptAt").defaultNow().notNull(),
  providerMessageId: varchar("providerMessageId", { length: 512 }),
  lastError: text("lastError"),
  redactedPayload: text("redactedPayload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("notification_delivery_idempotency_uq").on(table.idempotencyKey), uniqueIndex("notification_delivery_channel_uq").on(table.notificationId, table.channel), index("notification_delivery_status_attempt_idx").on(table.status, table.nextAttemptAt), index("notification_delivery_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workspaceId: int("workspaceId").references(() => workspaces.id, { onDelete: "set null" }),
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
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
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
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
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
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageReference: text("storageReference").notNull(),
  manifestHash: varchar("manifestHash", { length: 64 }).notNull(),
  signature: varchar("signature", { length: 64 }).notNull(),
  immutableBatchKey: varchar("immutableBatchKey", { length: 180 }).notNull(),
  retentionUntil: timestamp("retentionUntil").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  lastRestoreDrillAt: timestamp("lastRestoreDrillAt"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("audit_archive_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const policyVersions = mysqlTable("policyVersions", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  version: int("version").notNull(),
  safeHarbor: text("safeHarbor").notNull(),
  codeOfConduct: text("codeOfConduct").notNull(),
  allowlist: text("allowlist").notNull(),
  exclusions: text("exclusions").notNull(),
  changeSummary: text("changeSummary").notNull(),
  diffJson: text("diffJson").notNull(),
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  status: mysqlEnum("status", policyVersionStatus).default("pending").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  decidedByUserId: int("decidedByUserId"),
  decisionNote: text("decisionNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt"),
}, table => [
  uniqueIndex("policy_version_workspace_version_uq").on(table.workspaceId, table.version),
  index("policy_version_workspace_status_idx").on(table.workspaceId, table.status),
]);

export const incidents = mysqlTable("incidents", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  severity: mysqlEnum("severity", incidentSeverity).notNull(),
  status: mysqlEnum("status", incidentStatus).default("open").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  acknowledgedByUserId: int("acknowledgedByUserId"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  escalationDueAt: timestamp("escalationDueAt").notNull(),
  escalatedAt: timestamp("escalatedAt"),
  resolutionNote: text("resolutionNote"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("incident_workspace_status_due_idx").on(table.workspaceId, table.status, table.escalationDueAt)]);

export const incidentReviewStatus = ["open", "closed"] as const;
export const incidentReviews = mysqlTable("incidentReviews", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: int("incidentId").notNull(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  rootCause: text("rootCause").notNull(),
  actionItems: text("actionItems").notNull(),
  ownerUserId: int("ownerUserId"),
  dueAt: timestamp("dueAt"),
  closureEvidenceReference: varchar("closureEvidenceReference", { length: 512 }),
  status: mysqlEnum("status", incidentReviewStatus).default("open").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  closedByUserId: int("closedByUserId"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("incident_review_incident_uq").on(table.incidentId), index("incident_review_workspace_status_idx").on(table.workspaceId, table.status)]);

export const webhookActivationRequests = mysqlTable("webhookActivationRequests", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  webhookConfigurationId: int("webhookConfigurationId").notNull(),
  status: mysqlEnum("status", approvalStatus).default("pending").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  decidedByUserId: int("decidedByUserId"),
  decisionNote: text("decisionNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt"),
}, table => [index("webhook_activation_workspace_status_idx").on(table.workspaceId, table.status)]);

export const incidentEvidenceLinks = mysqlTable("incidentEvidenceLinks", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: int("incidentId").notNull(),
  evidenceArtifactId: int("evidenceArtifactId").notNull(),
  linkedByUserId: int("linkedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("incident_evidence_link_uq").on(table.incidentId, table.evidenceArtifactId),
  index("incident_evidence_incident_idx").on(table.incidentId),
]);

export const passiveAssetSource = ["csv", "json"] as const;
export const passiveAssets = mysqlTable("passiveAssets", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  value: varchar("value", { length: 512 }).notNull(),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  source: mysqlEnum("source", passiveAssetSource).notNull(),
  inScope: int("inScope").default(0).notNull(),
  reason: varchar("reason", { length: 32 }).notNull(),
  importedByUserId: int("importedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("passive_asset_workspace_scope_idx").on(table.workspaceId, table.inScope), index("passive_asset_workspace_host_idx").on(table.workspaceId, table.hostname)]);

export const reportPlatform = ["hackerone", "bugcrowd", "intigriti", "markdown"] as const;
export const submissionStatus = ["submitted", "acknowledged", "triaged", "accepted", "rejected", "duplicate", "resolved", "retest"] as const;
export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull().references(() => findings.id, { onDelete: "cascade" }),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  reportVersionId: int("reportVersionId").notNull().references(() => reportVersions.id, { onDelete: "restrict" }),
  platform: mysqlEnum("platform", reportPlatform).notNull(),
  externalReference: varchar("externalReference", { length: 240 }),
  status: mysqlEnum("status", submissionStatus).default("submitted").notNull(),
  submittedByUserId: int("submittedByUserId").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("submission_finding_created_idx").on(table.findingId, table.submittedAt), index("submission_workspace_status_idx").on(table.workspaceId, table.status)]);

export const submissionEvents = mysqlTable("submissionEvents", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  fromStatus: mysqlEnum("fromStatus", submissionStatus),
  toStatus: mysqlEnum("toStatus", submissionStatus).notNull(),
  note: text("note"),
  changedByUserId: int("changedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("submission_event_submission_created_idx").on(table.submissionId, table.createdAt), index("submission_event_workspace_idx").on(table.workspaceId)]);

export const reportVersions = mysqlTable("reportVersions", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull().references(() => findings.id, { onDelete: "cascade" }),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  platform: mysqlEnum("platform", reportPlatform).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  missingFields: text("missingFields").notNull(),
  readyForReview: int("readyForReview").default(0).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("report_version_finding_created_idx").on(table.findingId, table.createdAt), index("report_version_workspace_idx").on(table.workspaceId)]);

export const reportDrafts = mysqlTable("reportDrafts", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull().references(() => findings.id, { onDelete: "cascade" }),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  platform: mysqlEnum("platform", reportPlatform).notNull(),
  reportJson: text("reportJson").notNull(),
  lastSavedByUserId: int("lastSavedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("report_draft_finding_workspace_uq").on(table.findingId, table.workspaceId), index("report_draft_workspace_updated_idx").on(table.workspaceId, table.updatedAt)]);

export type Workspace = typeof workspaces.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type Approval = typeof approvals.$inferSelect;

export const findingComments = mysqlTable("findingComments", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  parentCommentId: int("parentCommentId"),
  authorUserId: int("authorUserId").notNull(),
  body: text("body").notNull(),
  mentions: text("mentions").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("finding_comment_finding_created_idx").on(table.findingId, table.createdAt), index("finding_comment_workspace_idx").on(table.workspaceId), index("finding_comment_parent_created_idx").on(table.parentCommentId, table.createdAt)]);

export type FindingComment = typeof findingComments.$inferSelect;


export const knowledgeNodeType = ["asset", "observation", "hypothesis", "finding", "intelligence", "entity", "document"] as const;
export const knowledgeNodeStatus = ["active", "archived"] as const;

export const knowledgeNodes = mysqlTable("knowledgeNodes", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  nodeType: mysqlEnum("nodeType", knowledgeNodeType).notNull(),
  externalId: varchar("externalId", { length: 160 }).notNull(),
  label: varchar("label", { length: 240 }).notNull(),
  properties: text("properties").notNull(),
  status: mysqlEnum("status", knowledgeNodeStatus).default("active").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("knowledge_node_workspace_external_uq").on(table.workspaceId, table.nodeType, table.externalId),
  index("knowledge_node_workspace_type_idx").on(table.workspaceId, table.nodeType, table.status),
  index("knowledge_node_workspace_updated_idx").on(table.workspaceId, table.updatedAt),
]);

export const knowledgeEdges = mysqlTable("knowledgeEdges", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  sourceNodeId: int("sourceNodeId").notNull().references(() => knowledgeNodes.id, { onDelete: "cascade" }),
  targetNodeId: int("targetNodeId").notNull().references(() => knowledgeNodes.id, { onDelete: "cascade" }),
  relationType: varchar("relationType", { length: 80 }).notNull(),
  confidence: int("confidence").default(100).notNull(),
  provenance: text("provenance").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("knowledge_edge_pair_relation_uq").on(table.workspaceId, table.sourceNodeId, table.targetNodeId, table.relationType),
  index("knowledge_edge_workspace_relation_idx").on(table.workspaceId, table.relationType, table.createdAt),
  index("knowledge_edge_source_idx").on(table.sourceNodeId),
  index("knowledge_edge_target_idx").on(table.targetNodeId),
]);

export type KnowledgeNode = typeof knowledgeNodes.$inferSelect;
export type KnowledgeEdge = typeof knowledgeEdges.$inferSelect;
