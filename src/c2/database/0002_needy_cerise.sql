CREATE TABLE `workspaceChangeSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`configurationDigest` varchar(64) NOT NULL,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceChangeSnapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `change_snapshot_workspace_uq` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
CREATE INDEX `change_snapshot_checked_idx` ON `workspaceChangeSnapshots` (`checkedAt`);
