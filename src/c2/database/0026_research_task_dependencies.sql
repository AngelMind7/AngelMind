CREATE TABLE `researchTaskDependencies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `taskId` int NOT NULL,
  `dependsOnTaskId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `researchTaskDependencies_id` PRIMARY KEY(`id`),
  CONSTRAINT `research_task_dependency_pair_uq` UNIQUE(`taskId`,`dependsOnTaskId`),
  CONSTRAINT `researchTaskDependencies_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action,
  CONSTRAINT `researchTaskDependencies_taskId_researchTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `researchTasks`(`id`) ON DELETE cascade ON UPDATE no action,
  CONSTRAINT `researchTaskDependencies_dependsOnTaskId_researchTasks_id_fk` FOREIGN KEY (`dependsOnTaskId`) REFERENCES `researchTasks`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `research_task_dependency_workspace_idx` ON `researchTaskDependencies` (`workspaceId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `research_task_dependency_parent_idx` ON `researchTaskDependencies` (`dependsOnTaskId`);
