CREATE TABLE `restoreDrillRuns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `archiveId` int NOT NULL,
  `workspaceId` int NOT NULL,
  `requestedByUserId` int NOT NULL,
  `idempotencyKey` varchar(180) NOT NULL,
  `status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
  `valid` int DEFAULT 0 NOT NULL,
  `recordsChecked` text NOT NULL,
  `errorMessage` varchar(2000),
  `startedAt` timestamp NOT NULL DEFAULT (now()),
  `completedAt` timestamp,
  CONSTRAINT `restoreDrillRuns_id` PRIMARY KEY(`id`),
  CONSTRAINT `restore_drill_archive_key_uq` UNIQUE(`archiveId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `restore_drill_workspace_started_idx` ON `restoreDrillRuns` (`workspaceId`,`startedAt`);
--> statement-breakpoint
CREATE INDEX `restore_drill_archive_status_idx` ON `restoreDrillRuns` (`archiveId`,`status`);
