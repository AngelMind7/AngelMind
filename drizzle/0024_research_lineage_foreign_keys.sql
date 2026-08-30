ALTER TABLE `evidenceProvenance` DROP INDEX `evidence_provenance_artifact_uq`;
--> statement-breakpoint
ALTER TABLE `researchEvidenceLinks` ADD CONSTRAINT `researchEvidenceLinks_evidenceArtifactId_evidenceArtifacts_id_fk` FOREIGN KEY (`evidenceArtifactId`) REFERENCES `evidenceArtifacts`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchEvidenceLinks` ADD CONSTRAINT `researchEvidenceLinks_observationId_researchObservations_id_fk` FOREIGN KEY (`observationId`) REFERENCES `researchObservations`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchEvidenceLinks` ADD CONSTRAINT `researchEvidenceLinks_hypothesisId_researchHypotheses_id_fk` FOREIGN KEY (`hypothesisId`) REFERENCES `researchHypotheses`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchAssets` ADD CONSTRAINT `researchAssets_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchObservations` ADD CONSTRAINT `researchObservations_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchObservations` ADD CONSTRAINT `researchObservations_assetId_researchAssets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `researchAssets`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchHypotheses` ADD CONSTRAINT `researchHypotheses_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchHypotheses` ADD CONSTRAINT `researchHypotheses_assetId_researchAssets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `researchAssets`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchHypotheses` ADD CONSTRAINT `researchHypotheses_observationId_researchObservations_id_fk` FOREIGN KEY (`observationId`) REFERENCES `researchObservations`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchTasks` ADD CONSTRAINT `researchTasks_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `findingRelations` ADD CONSTRAINT `findingRelations_findingId_findings_id_fk` FOREIGN KEY (`findingId`) REFERENCES `findings`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `findingRelations` ADD CONSTRAINT `findingRelations_relatedFindingId_findings_id_fk` FOREIGN KEY (`relatedFindingId`) REFERENCES `findings`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `findingRetests` ADD CONSTRAINT `findingRetests_findingId_findings_id_fk` FOREIGN KEY (`findingId`) REFERENCES `findings`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `findingRetests` ADD CONSTRAINT `findingRetests_evidenceArtifactId_evidenceArtifacts_id_fk` FOREIGN KEY (`evidenceArtifactId`) REFERENCES `evidenceArtifacts`(`id`) ON DELETE set null ON UPDATE no action;
