CREATE TABLE `accountSecurityEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('login','logout','token_rejected','password_reset_requested','mfa_enrolled','mfa_unenrolled','device_registered','device_revoked','profile_updated') NOT NULL,
	`deviceId` int,
	`ipHash` varchar(128),
	`userAgent` varchar(512),
	`metadata` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountSecurityEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiModels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelKey` varchar(160) NOT NULL,
	`provider` varchar(120) NOT NULL,
	`gateway` varchar(120) NOT NULL,
	`capabilities` text NOT NULL,
	`contextWindow` int NOT NULL DEFAULT 0,
	`status` enum('active','degraded','disabled') NOT NULL DEFAULT 'active',
	`version` varchar(80),
	`inputCostPerMillionCents` int NOT NULL DEFAULT 0,
	`outputCostPerMillionCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiModels_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_model_key_uq` UNIQUE(`modelKey`)
);
--> statement-breakpoint
CREATE TABLE `aiRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`sessionId` int,
	`taskId` int,
	`userId` int NOT NULL,
	`modelKey` varchar(160) NOT NULL,
	`gateway` varchar(120) NOT NULL,
	`purpose` varchar(120) NOT NULL,
	`traceId` varchar(128) NOT NULL,
	`inputReference` varchar(512) NOT NULL,
	`outputReference` varchar(512),
	`status` enum('queued','running','completed','failed','partial','cancelled') NOT NULL DEFAULT 'queued',
	`inputTokens` int NOT NULL DEFAULT 0,
	`outputTokens` int NOT NULL DEFAULT 0,
	`costCents` int NOT NULL DEFAULT 0,
	`errorCode` varchar(120),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workspaceId` int,
	`name` varchar(120) NOT NULL,
	`prefix` varchar(16) NOT NULL,
	`secretHash` varchar(64) NOT NULL,
	`scopes` text NOT NULL,
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`lastUsedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_key_secret_hash_uq` UNIQUE(`secretHash`)
);
--> statement-breakpoint
CREATE TABLE `authDevices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceFingerprint` varchar(128) NOT NULL,
	`label` varchar(120) NOT NULL,
	`platform` enum('web','ios','android','unknown') NOT NULL DEFAULT 'unknown',
	`userAgent` varchar(512),
	`lastIpHash` varchar(128),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`trusted` int NOT NULL DEFAULT 1,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authDevices_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_device_user_fingerprint_uq` UNIQUE(`userId`,`deviceFingerprint`)
);
--> statement-breakpoint
CREATE TABLE `evidenceProvenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evidenceArtifactId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`sourceType` varchar(64) NOT NULL,
	`sourceReference` varchar(512) NOT NULL,
	`capturedAt` timestamp NOT NULL,
	`capturedByUserId` int NOT NULL,
	`metadata` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidenceProvenance_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_provenance_artifact_uq` UNIQUE(`evidenceArtifactId`)
);
--> statement-breakpoint
CREATE TABLE `findingComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `findingComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `findingRelations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`findingId` int NOT NULL,
	`relatedFindingId` int NOT NULL,
	`relationType` enum('duplicate','related','supersedes') NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `findingRelations_id` PRIMARY KEY(`id`),
	CONSTRAINT `finding_relation_pair_uq` UNIQUE(`findingId`,`relatedFindingId`,`relationType`)
);
--> statement-breakpoint
CREATE TABLE `findingRetests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`findingId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`status` enum('requested','in_progress','passed','failed','inconclusive','cancelled') NOT NULL DEFAULT 'requested',
	`scopeDigest` varchar(128) NOT NULL,
	`resultSummary` text,
	`evidenceArtifactId` int,
	`reviewedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `findingRetests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int,
	`kind` varchar(80) NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`payload` text NOT NULL,
	`status` enum('queued','running','succeeded','failed','retrying','dead_letter','cancelled') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`availableAt` timestamp NOT NULL DEFAULT (now()),
	`lockedAt` timestamp,
	`lastError` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_idempotency_key_uq` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `onboardingProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('not_started','in_progress','completed','skipped') NOT NULL DEFAULT 'not_started',
	`currentStep` varchar(64) NOT NULL DEFAULT 'profile',
	`organizationName` varchar(160),
	`roleIntent` varchar(80),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboardingProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboarding_profile_user_uq` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizationEntitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`plan` enum('free','team','enterprise') NOT NULL DEFAULT 'free',
	`featureFlags` text NOT NULL,
	`limits` text NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizationEntitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_entitlement_uq` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `organizationMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','researcher','reviewer','auditor') NOT NULL DEFAULT 'researcher',
	`invitedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizationMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_member_uq` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`status` enum('active','suspended','archived') NOT NULL DEFAULT 'active',
	`settings` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `outboxEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int,
	`eventType` varchar(120) NOT NULL,
	`aggregateType` varchar(80) NOT NULL,
	`aggregateId` int NOT NULL,
	`idempotencyKey` varchar(180) NOT NULL,
	`payload` text NOT NULL,
	`status` enum('pending','published','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outboxEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `outbox_event_idempotency_uq` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `privacyRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`requestType` enum('export','delete','rectify') NOT NULL,
	`status` enum('requested','processing','completed','rejected') NOT NULL DEFAULT 'requested',
	`reason` text NOT NULL,
	`resultReference` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `privacyRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`status` enum('draft','active','paused','completed','archived') NOT NULL DEFAULT 'draft',
	`includedAssets` text NOT NULL,
	`excludedAssets` text NOT NULL,
	`rules` text NOT NULL,
	`safeHarbor` text NOT NULL,
	`currentVersion` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `program_organization_name_uq` UNIQUE(`organizationId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `promptVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purpose` varchar(120) NOT NULL,
	`version` int NOT NULL,
	`template` text NOT NULL,
	`variables` text NOT NULL,
	`compatibleModels` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promptVersions_id` PRIMARY KEY(`id`),
	CONSTRAINT `prompt_purpose_version_uq` UNIQUE(`purpose`,`version`)
);
--> statement-breakpoint
CREATE TABLE `researchAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`sessionId` int NOT NULL,
	`assetType` enum('domain','subdomain','ip','application','api','endpoint','technology','service') NOT NULL,
	`value` varchar(512) NOT NULL,
	`hostname` varchar(255),
	`state` enum('discovered','triaged','in_scope','out_of_scope','archived') NOT NULL DEFAULT 'discovered',
	`inScope` int NOT NULL DEFAULT 0,
	`metadata` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `researchAssets_id` PRIMARY KEY(`id`),
	CONSTRAINT `research_asset_session_value_uq` UNIQUE(`sessionId`,`value`)
);
--> statement-breakpoint
CREATE TABLE `researchHypotheses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`sessionId` int NOT NULL,
	`assetId` int,
	`observationId` int,
	`description` text NOT NULL,
	`reason` text NOT NULL,
	`priority` int NOT NULL DEFAULT 50,
	`status` enum('proposed','investigating','supported','disproven','validated','archived') NOT NULL DEFAULT 'proposed',
	`evidence` text NOT NULL,
	`aiAnalysis` text,
	`outcome` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `researchHypotheses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `researchObservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`sessionId` int NOT NULL,
	`assetId` int,
	`title` varchar(240) NOT NULL,
	`content` text NOT NULL,
	`status` enum('new','reviewed','linked','archived') NOT NULL DEFAULT 'new',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `researchObservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `researchSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`state` enum('draft','ready','active','paused','completed','archived') NOT NULL DEFAULT 'draft',
	`scopeDigest` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `researchSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `researchTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`sessionId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`title` varchar(240) NOT NULL,
	`priority` int NOT NULL DEFAULT 50,
	`status` enum('queued','running','blocked','paused','failed','retrying','completed','cancelled') NOT NULL DEFAULT 'queued',
	`ownerUserId` int,
	`dependencies` text NOT NULL,
	`inputs` text NOT NULL,
	`outputs` text NOT NULL,
	`retryCount` int NOT NULL DEFAULT 0,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `researchTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `workspaces` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `programId` int;--> statement-breakpoint
CREATE INDEX `account_security_event_user_created_idx` ON `accountSecurityEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `account_security_event_type_created_idx` ON `accountSecurityEvents` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_model_status_idx` ON `aiModels` (`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `ai_run_workspace_created_idx` ON `aiRuns` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_run_trace_idx` ON `aiRuns` (`traceId`);--> statement-breakpoint
CREATE INDEX `ai_run_status_idx` ON `aiRuns` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `api_key_user_status_idx` ON `apiKeys` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `api_key_workspace_status_idx` ON `apiKeys` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `auth_device_user_last_seen_idx` ON `authDevices` (`userId`,`lastSeenAt`);--> statement-breakpoint
CREATE INDEX `evidence_provenance_workspace_idx` ON `evidenceProvenance` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `finding_comment_finding_created_idx` ON `findingComments` (`findingId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `finding_comment_workspace_idx` ON `findingComments` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `finding_relation_workspace_idx` ON `findingRelations` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `finding_retest_workspace_status_idx` ON `findingRetests` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `finding_retest_finding_created_idx` ON `findingRetests` (`findingId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `job_status_available_idx` ON `jobs` (`status`,`availableAt`);--> statement-breakpoint
CREATE INDEX `job_workspace_created_idx` ON `jobs` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_entitlement_period_idx` ON `organizationEntitlements` (`periodEnd`);--> statement-breakpoint
CREATE INDEX `organization_member_user_idx` ON `organizationMembers` (`userId`,`role`);--> statement-breakpoint
CREATE INDEX `organization_owner_status_idx` ON `organizations` (`ownerUserId`,`status`);--> statement-breakpoint
CREATE INDEX `outbox_event_status_created_idx` ON `outboxEvents` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `outbox_event_workspace_idx` ON `outboxEvents` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `privacy_request_user_status_idx` ON `privacyRequests` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `privacy_request_created_idx` ON `privacyRequests` (`createdAt`);--> statement-breakpoint
CREATE INDEX `program_organization_status_idx` ON `programs` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `prompt_purpose_created_idx` ON `promptVersions` (`purpose`,`createdAt`);--> statement-breakpoint
CREATE INDEX `research_asset_session_state_idx` ON `researchAssets` (`sessionId`,`state`);--> statement-breakpoint
CREATE INDEX `research_hypothesis_session_status_idx` ON `researchHypotheses` (`sessionId`,`status`);--> statement-breakpoint
CREATE INDEX `research_hypothesis_observation_idx` ON `researchHypotheses` (`observationId`);--> statement-breakpoint
CREATE INDEX `research_observation_session_created_idx` ON `researchObservations` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `research_observation_asset_idx` ON `researchObservations` (`assetId`);--> statement-breakpoint
CREATE INDEX `research_session_workspace_state_idx` ON `researchSessions` (`workspaceId`,`state`);--> statement-breakpoint
CREATE INDEX `research_session_owner_updated_idx` ON `researchSessions` (`ownerUserId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `research_task_session_status_priority_idx` ON `researchTasks` (`sessionId`,`status`,`priority`);--> statement-breakpoint
CREATE INDEX `research_task_owner_status_idx` ON `researchTasks` (`ownerUserId`,`status`);
