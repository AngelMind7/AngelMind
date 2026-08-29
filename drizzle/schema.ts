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

export const accountSecurityEventType = ["login", "logout", "token_rejected", "password_reset_requested", "mfa_enrolled", "mfa_unenrolled", "device_registered", "device_revoked", "profile_updated"] as const;
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
  workspaceId: int("workspaceId"),
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

export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", programStatus).default("draft").notNull(),
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
export const findingStatus = ["discovered", "triaged", "candidate", "reproducing", "validated", "reported", "submitted", "invalid", "duplicate", "inconclusive"] as const;
export const approvalStatus = ["pending", "approved", "rejected", "expired"] as const;
export const notificationEventType = ["approval_required", "guardrail_blocked", "finding_validated", "scheduled_check", "policy_review_required", "incident_created", "webhook_activation_requested"] as const;
export const workspaceMemberRole = ["owner", "operator", "reviewer", "auditor"] as const;
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
export const researchObservationStatus = ["new", "reviewed", "linked", "archived"] as const;
export const researchHypothesisStatus = ["proposed", "investigating", "supported", "disproven", "validated", "archived"] as const;

export const researchSessions = mysqlTable("researchSessions", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  state: mysqlEnum("state", researchSessionState).default("draft").notNull(),
  scopeDigest: varchar("scopeDigest", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [index("research_session_workspace_state_idx").on(table.workspaceId, table.state), index("research_session_owner_updated_idx").on(table.ownerUserId, table.updatedAt)]);

export const researchAssets = mysqlTable("researchAssets", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  sessionId: int("sessionId").notNull(),
  assetType: mysqlEnum("assetType", researchAssetType).notNull(),
  value: varchar("value", { length: 512 }).notNull(),
  hostname: varchar("hostname", { length: 255 }),
  state: mysqlEnum("state", researchAssetState).default("discovered").notNull(),
  inScope: int("inScope").default(0).notNull(),
  metadata: text("metadata").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("research_asset_session_state_idx").on(table.sessionId, table.state), uniqueIndex("research_asset_session_value_uq").on(table.sessionId, table.value)]);

export const researchObservations = mysqlTable("researchObservations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  sessionId: int("sessionId").notNull(),
  assetId: int("assetId"),
  title: varchar("title", { length: 240 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", researchObservationStatus).default("new").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("research_observation_session_created_idx").on(table.sessionId, table.createdAt), index("research_observation_asset_idx").on(table.assetId)]);

export const researchHypotheses = mysqlTable("researchHypotheses", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  sessionId: int("sessionId").notNull(),
  assetId: int("assetId"),
  observationId: int("observationId"),
  description: text("description").notNull(),
  reason: text("reason").notNull(),
  priority: int("priority").default(50).notNull(),
  status: mysqlEnum("status", researchHypothesisStatus).default("proposed").notNull(),
  evidence: text("evidence").notNull(),
  aiAnalysis: text("aiAnalysis"),
  outcome: text("outcome"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("research_hypothesis_session_status_idx").on(table.sessionId, table.status), index("research_hypothesis_observation_idx").on(table.observationId)]);

export const researchTasks = mysqlTable("researchTasks", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  sessionId: int("sessionId").notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  priority: int("priority").default(50).notNull(),
  status: mysqlEnum("status", researchTaskStatus).default("queued").notNull(),
  ownerUserId: int("ownerUserId"),
  dependencies: text("dependencies").notNull(),
  inputs: text("inputs").notNull(),
  outputs: text("outputs").notNull(),
  retryCount: int("retryCount").default(0).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("research_task_session_status_priority_idx").on(table.sessionId, table.status, table.priority), index("research_task_owner_status_idx").on(table.ownerUserId, table.status)]);

export const aiModelStatus = ["active", "degraded", "disabled"] as const;
export const aiRunStatus = ["queued", "running", "completed", "failed", "partial", "cancelled"] as const;
export const jobStatus = ["queued", "running", "succeeded", "failed", "retrying", "dead_letter", "cancelled"] as const;
export const outboxEventStatus = ["pending", "published", "failed"] as const;

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
  workspaceId: int("workspaceId").notNull(),
  sessionId: int("sessionId"),
  taskId: int("taskId"),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("ai_run_workspace_created_idx").on(table.workspaceId, table.createdAt), index("ai_run_trace_idx").on(table.traceId), index("ai_run_status_idx").on(table.status, table.createdAt)]);

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
  workspaceId: int("workspaceId"),
  kind: varchar("kind", { length: 80 }).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
  payload: text("payload").notNull(),
  status: mysqlEnum("status", jobStatus).default("queued").notNull(),
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  availableAt: timestamp("availableAt").defaultNow().notNull(),
  lockedAt: timestamp("lockedAt"),
  lastError: text("lastError"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("job_idempotency_key_uq").on(table.idempotencyKey), index("job_status_available_idx").on(table.status, table.availableAt), index("job_workspace_created_idx").on(table.workspaceId, table.createdAt)]);

export const outboxEvents = mysqlTable("outboxEvents", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId"),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  aggregateType: varchar("aggregateType", { length: 80 }).notNull(),
  aggregateId: int("aggregateId").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 180 }).notNull(),
  payload: text("payload").notNull(),
  status: mysqlEnum("status", outboxEventStatus).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("outbox_event_idempotency_uq").on(table.idempotencyKey), index("outbox_event_status_created_idx").on(table.status, table.createdAt), index("outbox_event_workspace_idx").on(table.workspaceId, table.createdAt)]);

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

export const evidenceProvenance = mysqlTable("evidenceProvenance", {
  id: int("id").autoincrement().primaryKey(),
  evidenceArtifactId: int("evidenceArtifactId").notNull(),
  workspaceId: int("workspaceId").notNull(),
  sourceType: varchar("sourceType", { length: 64 }).notNull(),
  sourceReference: varchar("sourceReference", { length: 512 }).notNull(),
  capturedAt: timestamp("capturedAt").notNull(),
  capturedByUserId: int("capturedByUserId").notNull(),
  metadata: text("metadata").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("evidence_provenance_artifact_uq").on(table.evidenceArtifactId), index("evidence_provenance_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const findingRelations = mysqlTable("findingRelations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  findingId: int("findingId").notNull(),
  relatedFindingId: int("relatedFindingId").notNull(),
  relationType: mysqlEnum("relationType", ["duplicate", "related", "supersedes"] as const).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("finding_relation_pair_uq").on(table.findingId, table.relatedFindingId, table.relationType), index("finding_relation_workspace_idx").on(table.workspaceId, table.createdAt)]);

export const findingRetests = mysqlTable("findingRetests", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  findingId: int("findingId").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  status: mysqlEnum("status", ["requested", "in_progress", "passed", "failed", "inconclusive", "cancelled"] as const).default("requested").notNull(),
  scopeDigest: varchar("scopeDigest", { length: 128 }).notNull(),
  resultSummary: text("resultSummary"),
  evidenceArtifactId: int("evidenceArtifactId"),
  reviewedByUserId: int("reviewedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, table => [index("finding_retest_workspace_status_idx").on(table.workspaceId, table.status), index("finding_retest_finding_created_idx").on(table.findingId, table.createdAt)]);

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

export const policyVersions = mysqlTable("policyVersions", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
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
  workspaceId: int("workspaceId").notNull(),
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

export const webhookActivationRequests = mysqlTable("webhookActivationRequests", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
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
  workspaceId: int("workspaceId").notNull(),
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
  findingId: int("findingId").notNull(),
  workspaceId: int("workspaceId").notNull(),
  reportVersionId: int("reportVersionId").notNull(),
  platform: mysqlEnum("platform", reportPlatform).notNull(),
  externalReference: varchar("externalReference", { length: 240 }),
  status: mysqlEnum("status", submissionStatus).default("submitted").notNull(),
  submittedByUserId: int("submittedByUserId").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("submission_finding_created_idx").on(table.findingId, table.submittedAt), index("submission_workspace_status_idx").on(table.workspaceId, table.status)]);

export const submissionEvents = mysqlTable("submissionEvents", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  workspaceId: int("workspaceId").notNull(),
  fromStatus: mysqlEnum("fromStatus", submissionStatus),
  toStatus: mysqlEnum("toStatus", submissionStatus).notNull(),
  note: text("note"),
  changedByUserId: int("changedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("submission_event_submission_created_idx").on(table.submissionId, table.createdAt), index("submission_event_workspace_idx").on(table.workspaceId)]);

export const reportVersions = mysqlTable("reportVersions", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull(),
  workspaceId: int("workspaceId").notNull(),
  platform: mysqlEnum("platform", reportPlatform).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  missingFields: text("missingFields").notNull(),
  readyForReview: int("readyForReview").default(0).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("report_version_finding_created_idx").on(table.findingId, table.createdAt), index("report_version_workspace_idx").on(table.workspaceId)]);

export type Workspace = typeof workspaces.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type Approval = typeof approvals.$inferSelect;

export const findingComments = mysqlTable("findingComments", {
  id: int("id").autoincrement().primaryKey(),
  findingId: int("findingId").notNull(),
  workspaceId: int("workspaceId").notNull(),
  authorUserId: int("authorUserId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("finding_comment_finding_created_idx").on(table.findingId, table.createdAt), index("finding_comment_workspace_idx").on(table.workspaceId)]);

export type FindingComment = typeof findingComments.$inferSelect;
