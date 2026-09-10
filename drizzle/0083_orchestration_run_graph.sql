CREATE TABLE `orchestrationRuns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `createdByUserId` int NOT NULL,
  `objective` varchar(2000) NOT NULL,
  `evidenceReferences` text NOT NULL,
  `planHash` varchar(64) NOT NULL,
  `status` enum('queued','running','completed','failed','needs_review','cancelled') NOT NULL DEFAULT 'queued',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `orchestrationRuns_id` PRIMARY KEY(`id`),
  CONSTRAINT `orchestrationRuns_workspace_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `orchestration_run_workspace_created_idx` ON `orchestrationRuns` (`workspaceId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `orchestration_run_status_idx` ON `orchestrationRuns` (`status`,`updatedAt`);
--> statement-breakpoint
CREATE TABLE `orchestrationNodes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `orchestrationRunId` int NOT NULL,
  `taskKey` varchar(120) NOT NULL,
  `role` varchar(40) NOT NULL,
  `objective` varchar(2000) NOT NULL,
  `dependsOn` text NOT NULL,
  `status` enum('queued','blocked','running','completed','failed','needs_review') NOT NULL DEFAULT 'queued',
  `observationJson` text,
  `evidenceHash` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `orchestrationNodes_id` PRIMARY KEY(`id`),
  CONSTRAINT `orchestrationNodes_workspace_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE,
  CONSTRAINT `orchestrationNodes_run_fk` FOREIGN KEY (`orchestrationRunId`) REFERENCES `orchestrationRuns`(`id`) ON DELETE CASCADE,
  CONSTRAINT `orchestration_node_run_task_uq` UNIQUE(`orchestrationRunId`,`taskKey`)
);
--> statement-breakpoint
CREATE INDEX `orchestration_node_workspace_status_idx` ON `orchestrationNodes` (`workspaceId`,`status`,`updatedAt`);
