CREATE TABLE `reportDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`platform` enum('hackerone','bugcrowd','intigriti','markdown') NOT NULL,
	`reportJson` text NOT NULL,
	`lastSavedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reportDrafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_draft_finding_workspace_uq` UNIQUE(`findingId`,`workspaceId`)
);
--> statement-breakpoint
CREATE INDEX `report_draft_workspace_updated_idx` ON `reportDrafts` (`workspaceId`,`updatedAt`);