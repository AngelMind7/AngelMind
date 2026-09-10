ALTER TABLE `passiveAssets`
  ADD COLUMN `status` enum('active','stale','retired') NOT NULL DEFAULT 'active',
  ADD COLUMN `firstSeenAt` timestamp NOT NULL DEFAULT (now()),
  ADD COLUMN `lastSeenAt` timestamp NOT NULL DEFAULT (now());
--> statement-breakpoint
CREATE INDEX `passive_asset_workspace_status_idx` ON `passiveAssets` (`workspaceId`,`status`,`lastSeenAt`);
--> statement-breakpoint
CREATE TABLE `passiveAssetDiscoveryRuns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `source` enum('csv','json') NOT NULL,
  `contentSha256` varchar(64) NOT NULL,
  `observedAt` timestamp NOT NULL DEFAULT (now()),
  `importedByUserId` int NOT NULL,
  `totalCandidates` int NOT NULL DEFAULT 0,
  `inScopeCount` int NOT NULL DEFAULT 0,
  `newCount` int NOT NULL DEFAULT 0,
  `staleCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `passiveAssetDiscoveryRuns_id` PRIMARY KEY(`id`),
  CONSTRAINT `passiveAssetDiscoveryRuns_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `passive_discovery_workspace_observed_idx` ON `passiveAssetDiscoveryRuns` (`workspaceId`,`observedAt`);
--> statement-breakpoint
CREATE INDEX `passive_discovery_workspace_hash_idx` ON `passiveAssetDiscoveryRuns` (`workspaceId`,`contentSha256`);
