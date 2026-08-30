CREATE TABLE `failureObservations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `sessionId` int NOT NULL,
  `kind` enum('timeout','dependency_failure','partial_response','error_state','recovery_behavior','retry_behavior','concurrency','race_condition','transaction_failure','degraded_mode','cascading_failure') NOT NULL,
  `normalState` varchar(240) NOT NULL,
  `condition` text NOT NULL,
  `observedBehavior` text NOT NULL,
  `impact` enum('none','low','medium','high','critical') NOT NULL DEFAULT 'low',
  `evidenceRefs` text NOT NULL,
  `status` enum('observed','triaged','validated','archived') NOT NULL DEFAULT 'observed',
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `failureObservations_id` PRIMARY KEY(`id`),
  CONSTRAINT `failureObservations_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `failureObservations_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `failure_observation_workspace_status_idx` ON `failureObservations` (`workspaceId`,`status`);
--> statement-breakpoint
CREATE INDEX `failure_observation_session_created_idx` ON `failureObservations` (`sessionId`,`createdAt`);
--> statement-breakpoint
CREATE TABLE `evolutionSnapshots` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `sessionId` int,
  `assetRef` varchar(512) NOT NULL,
  `version` varchar(120) NOT NULL,
  `capturedAt` timestamp NOT NULL,
  `attributes` text NOT NULL,
  `source` varchar(120) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `evolutionSnapshots_id` PRIMARY KEY(`id`),
  CONSTRAINT `evolutionSnapshots_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `evolutionSnapshots_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `evolution_snapshot_workspace_asset_idx` ON `evolutionSnapshots` (`workspaceId`,`assetRef`,`capturedAt`);
--> statement-breakpoint
CREATE TABLE `intelligenceFeedItems` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `source` varchar(120) NOT NULL,
  `assetRef` varchar(512) NOT NULL,
  `observedAt` timestamp NOT NULL,
  `confidence` int NOT NULL,
  `reference` varchar(512),
  `data` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `intelligenceFeedItems_id` PRIMARY KEY(`id`),
  CONSTRAINT `intelligenceFeedItems_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `intelligence_feed_workspace_asset_idx` ON `intelligenceFeedItems` (`workspaceId`,`assetRef`,`observedAt`);
--> statement-breakpoint
CREATE INDEX `intelligence_feed_source_idx` ON `intelligenceFeedItems` (`source`,`observedAt`);
--> statement-breakpoint
CREATE TABLE `playbooks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `slug` varchar(160) NOT NULL,
  `version` varchar(40) NOT NULL,
  `status` enum('draft','active','deprecated') NOT NULL DEFAULT 'draft',
  `domains` text NOT NULL,
  `assetTypes` text NOT NULL,
  `technologies` text NOT NULL,
  `taskTemplates` text NOT NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `playbooks_id` PRIMARY KEY(`id`),
  CONSTRAINT `playbooks_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `playbook_workspace_slug_version_uq` UNIQUE(`workspaceId`,`slug`,`version`)
);
--> statement-breakpoint
CREATE INDEX `playbook_workspace_status_idx` ON `playbooks` (`workspaceId`,`status`);
