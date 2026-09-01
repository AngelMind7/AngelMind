CREATE TABLE `playbookRuns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `playbookId` int NOT NULL,
  `sessionId` int NOT NULL,
  `status` enum('queued','running','paused','failed','completed','cancelled') NOT NULL DEFAULT 'queued',
  `taskIds` text NOT NULL,
  `checkpoint` text NOT NULL,
  `retryCount` int NOT NULL DEFAULT 0,
  `lastError` text,
  `createdByUserId` int NOT NULL,
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `playbookRuns_pk` PRIMARY KEY (`id`),
  CONSTRAINT `playbookRuns_workspace_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `playbookRuns_playbook_fk` FOREIGN KEY (`playbookId`) REFERENCES `playbooks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `playbookRuns_session_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions` (`id`) ON DELETE CASCADE
);
CREATE INDEX `playbook_run_workspace_status_idx` ON `playbookRuns` (`workspaceId`, `status`, `updatedAt`);
CREATE INDEX `playbook_run_session_idx` ON `playbookRuns` (`sessionId`, `createdAt`);
