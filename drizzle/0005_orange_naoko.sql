CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`status` enum('open','acknowledged','resolved') NOT NULL DEFAULT 'open',
	`createdByUserId` int NOT NULL,
	`acknowledgedByUserId` int,
	`acknowledgedAt` timestamp,
	`escalationDueAt` timestamp NOT NULL,
	`escalatedAt` timestamp,
	`resolutionNote` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policyVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`version` int NOT NULL,
	`safeHarbor` text NOT NULL,
	`codeOfConduct` text NOT NULL,
	`allowlist` text NOT NULL,
	`exclusions` text NOT NULL,
	`changeSummary` text NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`status` enum('pending','approved','rejected','superseded') NOT NULL DEFAULT 'pending',
	`requestedByUserId` int NOT NULL,
	`decidedByUserId` int,
	`decisionNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	CONSTRAINT `policyVersions_id` PRIMARY KEY(`id`),
	CONSTRAINT `policy_version_workspace_version_uq` UNIQUE(`workspaceId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `webhookActivationRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`webhookConfigurationId` int NOT NULL,
	`status` enum('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
	`requestedByUserId` int NOT NULL,
	`decidedByUserId` int,
	`decisionNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	CONSTRAINT `webhookActivationRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notificationPreferences` MODIFY COLUMN `eventType` enum('approval_required','guardrail_blocked','finding_validated','scheduled_check','policy_review_required','incident_created','webhook_activation_requested') NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `eventType` enum('approval_required','guardrail_blocked','finding_validated','scheduled_check','policy_review_required','incident_created','webhook_activation_requested') NOT NULL;--> statement-breakpoint
CREATE INDEX `incident_workspace_status_due_idx` ON `incidents` (`workspaceId`,`status`,`escalationDueAt`);--> statement-breakpoint
CREATE INDEX `policy_version_workspace_status_idx` ON `policyVersions` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `webhook_activation_workspace_status_idx` ON `webhookActivationRequests` (`workspaceId`,`status`);