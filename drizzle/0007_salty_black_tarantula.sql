CREATE TABLE `passiveAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`value` varchar(512) NOT NULL,
	`hostname` varchar(255) NOT NULL,
	`source` enum('csv','json') NOT NULL,
	`inScope` int NOT NULL DEFAULT 0,
	`reason` varchar(32) NOT NULL,
	`importedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passiveAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reportVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`platform` enum('hackerone','bugcrowd','intigriti','markdown') NOT NULL,
	`title` varchar(240) NOT NULL,
	`body` text NOT NULL,
	`missingFields` text NOT NULL,
	`readyForReview` int NOT NULL DEFAULT 0,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reportVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `passive_asset_workspace_scope_idx` ON `passiveAssets` (`workspaceId`,`inScope`);--> statement-breakpoint
CREATE INDEX `passive_asset_workspace_host_idx` ON `passiveAssets` (`workspaceId`,`hostname`);--> statement-breakpoint
CREATE INDEX `report_version_finding_created_idx` ON `reportVersions` (`findingId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `report_version_workspace_idx` ON `reportVersions` (`workspaceId`);