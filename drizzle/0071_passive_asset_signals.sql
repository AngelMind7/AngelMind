CREATE TABLE `researchAssetSignals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `sessionId` int NOT NULL,
  `assetId` int,
  `signalType` enum('certificate_expiry','service_exposure','cloud_exposure','code_leak','subdomain_history','brand_mention') NOT NULL,
  `status` enum('observed','acknowledged','resolved') NOT NULL DEFAULT 'observed',
  `fingerprint` varchar(64) NOT NULL,
  `title` varchar(240) NOT NULL,
  `details` text NOT NULL,
  `source` varchar(255) NOT NULL,
  `confidence` int NOT NULL DEFAULT 50,
  `observedAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NULL,
  `traceId` varchar(128),
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `researchAssetSignals_id` PRIMARY KEY(`id`),
  CONSTRAINT `research_asset_signal_fingerprint_uq` UNIQUE(`sessionId`,`fingerprint`),
  CONSTRAINT `researchAssetSignals_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `researchAssetSignals_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE cascade,
  CONSTRAINT `researchAssetSignals_assetId_researchAssets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `researchAssets`(`id`) ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `research_asset_signal_workspace_status_idx` ON `researchAssetSignals` (`workspaceId`,`status`,`observedAt`);
--> statement-breakpoint
CREATE INDEX `research_asset_signal_asset_idx` ON `researchAssetSignals` (`assetId`,`signalType`);
