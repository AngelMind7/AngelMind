ALTER TABLE `aiRuns` ADD CONSTRAINT `aiRuns_sessionId_researchSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `aiRuns` ADD CONSTRAINT `aiRuns_taskId_researchTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `researchTasks`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `aiRunEvaluations` ADD CONSTRAINT `aiRunEvaluations_runId_aiRuns_id_fk` FOREIGN KEY (`runId`) REFERENCES `aiRuns`(`id`) ON DELETE cascade ON UPDATE no action;
