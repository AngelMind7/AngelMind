CREATE TABLE `programScopeVersions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `programId` int NOT NULL,
  `organizationId` int NOT NULL,
  `version` int NOT NULL,
  `includedAssets` text NOT NULL,
  `excludedAssets` text NOT NULL,
  `rules` text NOT NULL,
  `safeHarbor` text NOT NULL,
  `changedByUserId` int NOT NULL,
  `changeSummary` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `programScopeVersions_id` PRIMARY KEY(`id`),
  CONSTRAINT `program_scope_version_uq` UNIQUE(`programId`,`version`)
);
--> statement-breakpoint
CREATE INDEX `program_scope_version_org_idx` ON `programScopeVersions` (`organizationId`,`createdAt`);
--> statement-breakpoint
ALTER TABLE `researchSessions`
  ADD COLUMN `programId` int NULL,
  ADD COLUMN `programVersion` int NULL;
--> statement-breakpoint
CREATE INDEX `research_session_program_idx` ON `researchSessions` (`programId`,`programVersion`);
