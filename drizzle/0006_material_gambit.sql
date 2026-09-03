CREATE TABLE `incidentEvidenceLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incidentId` int NOT NULL,
	`evidenceArtifactId` int NOT NULL,
	`linkedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `incidentEvidenceLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `incident_evidence_link_uq` UNIQUE(`incidentId`,`evidenceArtifactId`)
);
--> statement-breakpoint
ALTER TABLE `policyVersions` ADD `diffJson` text NOT NULL;--> statement-breakpoint
CREATE INDEX `incident_evidence_incident_idx` ON `incidentEvidenceLinks` (`incidentId`);
