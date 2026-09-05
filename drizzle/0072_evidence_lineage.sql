CREATE TABLE `evidenceLineage` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `evidenceArtifactId` int NOT NULL,
  `sourceNodeType` enum('external_source','evidence_artifact','observation','hypothesis','finding','finding_retest','report_version') NOT NULL,
  `sourceNodeId` int NOT NULL,
  `targetNodeType` enum('external_source','evidence_artifact','observation','hypothesis','finding','finding_retest','report_version') NOT NULL,
  `targetNodeId` int NOT NULL,
  `relationType` enum('captured_from','supports','derived_from','retested_by','reported_in') NOT NULL,
  `metadata` text NOT NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `evidenceLineage_id` PRIMARY KEY(`id`),
  CONSTRAINT `evidence_lineage_edge_uq` UNIQUE(`workspaceId`,`evidenceArtifactId`,`sourceNodeType`,`sourceNodeId`,`targetNodeType`,`targetNodeId`,`relationType`),
  CONSTRAINT `evidenceLineage_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `evidenceLineage_evidenceArtifactId_evidenceArtifacts_id_fk` FOREIGN KEY (`evidenceArtifactId`) REFERENCES `evidenceArtifacts`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evidence_lineage_workspace_created_idx` ON `evidenceLineage` (`workspaceId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `evidence_lineage_target_idx` ON `evidenceLineage` (`targetNodeType`,`targetNodeId`);
