CREATE TABLE `researchAssetRelations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `sessionId` int NOT NULL,
  `sourceAssetId` int NOT NULL,
  `targetAssetId` int NOT NULL,
  `relationType` enum('depends_on','hosts','resolves_to','uses_technology','exposes_service','related_to') NOT NULL,
  `metadata` text NOT NULL,
  `traceId` varchar(128),
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `researchAssetRelations_id` PRIMARY KEY(`id`),
  CONSTRAINT `research_asset_relation_uq` UNIQUE(`sessionId`,`sourceAssetId`,`targetAssetId`,`relationType`),
  CONSTRAINT `researchAssetRelations_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `researchAssetRelations_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE cascade,
  CONSTRAINT `researchAssetRelations_sourceAssetId_researchAssets_id_fk` FOREIGN KEY (`sourceAssetId`) REFERENCES `researchAssets`(`id`) ON DELETE cascade,
  CONSTRAINT `researchAssetRelations_targetAssetId_researchAssets_id_fk` FOREIGN KEY (`targetAssetId`) REFERENCES `researchAssets`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `research_asset_relation_workspace_idx` ON `researchAssetRelations` (`workspaceId`,`relationType`);
--> statement-breakpoint
CREATE INDEX `research_asset_relation_target_idx` ON `researchAssetRelations` (`targetAssetId`);
