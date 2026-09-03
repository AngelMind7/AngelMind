ALTER TABLE `researchSessions` ADD COLUMN `traceId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `researchAssets` ADD COLUMN `traceId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `researchObservations` ADD COLUMN `traceId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `researchHypotheses` ADD COLUMN `traceId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `researchTasks` ADD COLUMN `traceId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `findings` ADD COLUMN `traceId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `evidenceArtifacts` ADD COLUMN `traceId` varchar(128) NULL;
--> statement-breakpoint
CREATE INDEX `research_session_trace_idx` ON `researchSessions` (`traceId`);
--> statement-breakpoint
CREATE INDEX `research_asset_trace_idx` ON `researchAssets` (`traceId`);
--> statement-breakpoint
CREATE INDEX `research_observation_trace_idx` ON `researchObservations` (`traceId`);
--> statement-breakpoint
CREATE INDEX `research_hypothesis_trace_idx` ON `researchHypotheses` (`traceId`);
--> statement-breakpoint
CREATE INDEX `research_task_trace_idx` ON `researchTasks` (`traceId`);
--> statement-breakpoint
CREATE INDEX `finding_trace_idx` ON `findings` (`traceId`);
--> statement-breakpoint
CREATE INDEX `evidence_artifact_trace_idx` ON `evidenceArtifacts` (`traceId`);
