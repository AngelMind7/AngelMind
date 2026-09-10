CREATE TABLE `auditArchives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageReference` text NOT NULL,
	`manifestHash` varchar(64) NOT NULL,
	`signature` varchar(64) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditArchives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhookConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`endpoint` varchar(2048) NOT NULL,
	`signingSecretReference` varchar(240),
	`eventTypes` text NOT NULL,
	`endpointConfirmed` int NOT NULL DEFAULT 0,
	`enabled` int NOT NULL DEFAULT 0,
	`createdByUserId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhookConfigurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_workspace_uq` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `workspaceMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','operator','reviewer','auditor') NOT NULL,
	`addedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_member_user_uq` UNIQUE(`workspaceId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `audit_archive_workspace_created_idx` ON `auditArchives` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workspace_member_user_role_idx` ON `workspaceMemberships` (`userId`,`role`);
