CREATE TABLE `incidentReviews` (
  `id` int AUTO_INCREMENT NOT NULL,
  `incidentId` int NOT NULL,
  `workspaceId` int NOT NULL,
  `summary` text NOT NULL,
  `rootCause` text NOT NULL,
  `actionItems` text NOT NULL,
  `ownerUserId` int,
  `dueAt` timestamp,
  `closureEvidenceReference` varchar(512),
  `status` enum('open','closed') NOT NULL DEFAULT 'open',
  `createdByUserId` int NOT NULL,
  `closedByUserId` int,
  `closedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  CONSTRAINT `incidentReviews_id` PRIMARY KEY(`id`),
  CONSTRAINT `incident_review_incident_uq` UNIQUE(`incidentId`),
  CONSTRAINT `incidentReviews_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX `incident_review_workspace_status_idx` ON `incidentReviews` (`workspaceId`,`status`);
