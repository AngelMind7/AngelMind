ALTER TABLE `researchObservations`
  ADD COLUMN `sourceType` varchar(80) NOT NULL DEFAULT 'manual',
  ADD COLUMN `sourceReference` varchar(512),
  ADD COLUMN `rawOutputSha256` varchar(64),
  ADD COLUMN `normalizedEvidenceSha256` varchar(64);
--> statement-breakpoint
CREATE INDEX `research_observation_source_idx` ON `researchObservations` (`workspaceId`,`sourceType`,`createdAt`);
