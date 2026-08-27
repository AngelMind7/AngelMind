CREATE TABLE `approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`runId` int,
	`actionName` varchar(160) NOT NULL,
	`tier` enum('tier1','tier2','tier3') NOT NULL,
	`status` enum('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
	`requestedByUserId` int NOT NULL,
	`decidedByUserId` int,
	`decisionNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	CONSTRAINT `approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`category` varchar(80) NOT NULL,
	`subject` varchar(160) NOT NULL,
	`evidenceHash` varchar(64) NOT NULL,
	`details` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credentialReferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`secretReference` varchar(200) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credentialReferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `credential_workspace_label_uq` UNIQUE(`workspaceId`,`label`)
);
--> statement-breakpoint
CREATE TABLE `evidenceArtifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`findingId` int,
	`artifactType` varchar(80) NOT NULL,
	`storageReference` text NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidenceArtifacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`fingerprint` varchar(96) NOT NULL,
	`title` varchar(240) NOT NULL,
	`status` enum('discovered','triaged','candidate','reproducing','validated','reported','submitted','invalid','duplicate','inconclusive') NOT NULL DEFAULT 'discovered',
	`confidence` int NOT NULL DEFAULT 0,
	`impactSummary` text NOT NULL,
	`reportDraft` text NOT NULL,
	`humanReviewStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `findings_id` PRIMARY KEY(`id`),
	CONSTRAINT `findings_workspace_fingerprint_uq` UNIQUE(`workspaceId`,`fingerprint`)
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`mode` enum('dry_run','administrative') NOT NULL,
	`status` enum('queued','running','checkpointed','completed','blocked','failed') NOT NULL,
	`governanceTier` enum('tier1','tier2','tier3') NOT NULL,
	`plannedTaskCount` int NOT NULL DEFAULT 0,
	`estimatedCostCents` int NOT NULL DEFAULT 0,
	`estimatedDurationMinutes` int NOT NULL DEFAULT 0,
	`eventLog` text NOT NULL,
	`checkpoint` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`programName` varchar(160) NOT NULL,
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`safeHarbor` text NOT NULL,
	`codeOfConduct` text NOT NULL,
	`allowlist` text NOT NULL,
	`exclusions` text NOT NULL,
	`budgetCents` int NOT NULL DEFAULT 0,
	`spentCents` int NOT NULL DEFAULT 0,
	`sessionLimitMinutes` int NOT NULL DEFAULT 240,
	`cooldownMinutes` int NOT NULL DEFAULT 60,
	`retentionDays` int NOT NULL DEFAULT 30,
	`lastRunAt` timestamp,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_schedule_cron_task_uid_uq` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE INDEX `approvals_workspace_status_idx` ON `approvals` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `audit_workspace_created_idx` ON `auditEvents` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `credential_workspace_idx` ON `credentialReferences` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `evidence_workspace_created_idx` ON `evidenceArtifacts` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `findings_workspace_status_idx` ON `findings` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `runs_workspace_created_idx` ON `runs` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workspaces_owner_status_idx` ON `workspaces` (`ownerUserId`,`status`);