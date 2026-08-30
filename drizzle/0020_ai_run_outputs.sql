CREATE TABLE `aiRunOutputs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `runId` int NOT NULL,
  `outputJson` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `aiRunOutputs_id` PRIMARY KEY(`id`),
  CONSTRAINT `ai_run_output_run_uq` UNIQUE(`runId`),
  CONSTRAINT `aiRunOutputs_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `aiRunOutputs_runId_aiRuns_id_fk` FOREIGN KEY (`runId`) REFERENCES `aiRuns`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_run_output_workspace_created_idx` ON `aiRunOutputs` (`workspaceId`,`createdAt`);
