CREATE TABLE `researchEvidenceLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`evidenceArtifactId` int NOT NULL,
	`observationId` int,
	`hypothesisId` int,
	`linkType` varchar(40) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `researchEvidenceLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `research_evidence_link_workspace_idx` ON `researchEvidenceLinks` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `research_evidence_link_artifact_idx` ON `researchEvidenceLinks` (`evidenceArtifactId`);--> statement-breakpoint
CREATE INDEX `research_evidence_link_observation_idx` ON `researchEvidenceLinks` (`observationId`);--> statement-breakpoint
CREATE INDEX `research_evidence_link_hypothesis_idx` ON `researchEvidenceLinks` (`hypothesisId`);