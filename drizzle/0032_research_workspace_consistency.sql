ALTER TABLE `researchSessions` ADD UNIQUE INDEX `research_session_id_workspace_idx` (`id`,`workspaceId`);
--> statement-breakpoint
ALTER TABLE `researchAssets` ADD INDEX `research_asset_id_workspace_idx` (`id`,`workspaceId`);
--> statement-breakpoint
ALTER TABLE `researchObservations` ADD INDEX `research_observation_id_workspace_idx` (`id`,`workspaceId`);
--> statement-breakpoint
ALTER TABLE `researchAssets` ADD CONSTRAINT `research_asset_session_workspace_fk` FOREIGN KEY (`sessionId`,`workspaceId`) REFERENCES `researchSessions`(`id`,`workspaceId`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchObservations` ADD CONSTRAINT `research_observation_session_workspace_fk` FOREIGN KEY (`sessionId`,`workspaceId`) REFERENCES `researchSessions`(`id`,`workspaceId`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchHypotheses` ADD CONSTRAINT `research_hypothesis_session_workspace_fk` FOREIGN KEY (`sessionId`,`workspaceId`) REFERENCES `researchSessions`(`id`,`workspaceId`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `researchTasks` ADD CONSTRAINT `research_task_session_workspace_fk` FOREIGN KEY (`sessionId`,`workspaceId`) REFERENCES `researchSessions`(`id`,`workspaceId`) ON DELETE cascade ON UPDATE no action;
