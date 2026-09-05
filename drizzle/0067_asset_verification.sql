ALTER TABLE `researchAssets`
  ADD COLUMN `verificationStatus` enum('unverified','requested','pending_review','verified','rejected','expired','cancelled') NOT NULL DEFAULT 'unverified',
  ADD COLUMN `verifiedAt` timestamp;
--> statement-breakpoint
CREATE INDEX `research_asset_verification_idx` ON `researchAssets` (`workspaceId`,`verificationStatus`,`verifiedAt`);
--> statement-breakpoint
CREATE TABLE `researchAssetVerifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `assetId` int NOT NULL,
  `method` enum('dns_txt','file_upload','cloud_role','authorization_letter') NOT NULL,
  `status` enum('requested','pending_review','verified','rejected','expired','cancelled') NOT NULL DEFAULT 'requested',
  `tokenHash` varchar(64) NOT NULL,
  `challengeReference` varchar(512) NOT NULL,
  `proofReference` varchar(512),
  `evidenceArtifactId` int,
  `submittedByUserId` int,
  `reviewedByUserId` int,
  `reviewNote` text,
  `expiresAt` timestamp NOT NULL,
  `verifiedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `researchAssetVerifications_id` PRIMARY KEY(`id`),
  CONSTRAINT `researchAssetVerifications_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `researchAssetVerifications_assetId_researchAssets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `researchAssets`(`id`) ON DELETE cascade,
  CONSTRAINT `researchAssetVerifications_evidenceArtifactId_evidenceArtifacts_id_fk` FOREIGN KEY (`evidenceArtifactId`) REFERENCES `evidenceArtifacts`(`id`) ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `asset_verification_workspace_status_idx` ON `researchAssetVerifications` (`workspaceId`,`status`,`expiresAt`);
--> statement-breakpoint
CREATE INDEX `asset_verification_asset_created_idx` ON `researchAssetVerifications` (`assetId`,`createdAt`);
