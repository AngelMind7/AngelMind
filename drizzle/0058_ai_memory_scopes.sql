-- Governed AI memory scopes with retention, ownership, and cross-workspace foreign-key boundaries.
CREATE TABLE `aiMemories` (
  `id` int AUTO_INCREMENT NOT NULL,
  `scope` enum('user','workspace','session','program') NOT NULL,
  `status` enum('active','archived','purged') NOT NULL DEFAULT 'active',
  `userId` int NOT NULL,
  `workspaceId` int,
  `sessionId` int,
  `programId` int,
  `memoryKey` varchar(160) NOT NULL,
  `scopeKey` varchar(512) NOT NULL,
  `content` text NOT NULL,
  `sourceReference` varchar(512),
  `retentionUntil` timestamp NOT NULL,
  `revision` int NOT NULL DEFAULT 0,
  `archivedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `aiMemories_id` PRIMARY KEY(`id`),
  CONSTRAINT `aiMemories_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `aiMemories_workspace_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE,
  CONSTRAINT `aiMemories_session_fk` FOREIGN KEY (`sessionId`) REFERENCES `researchSessions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `aiMemories_program_fk` FOREIGN KEY (`programId`) REFERENCES `programs`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_memory_scope_key_uq` ON `aiMemories` (`scopeKey`);
--> statement-breakpoint
CREATE INDEX `ai_memory_user_status_idx` ON `aiMemories` (`userId`,`status`,`updatedAt`);
--> statement-breakpoint
CREATE INDEX `ai_memory_workspace_status_idx` ON `aiMemories` (`workspaceId`,`status`,`updatedAt`);
--> statement-breakpoint
CREATE INDEX `ai_memory_session_status_idx` ON `aiMemories` (`sessionId`,`status`,`updatedAt`);
--> statement-breakpoint
CREATE INDEX `ai_memory_program_status_idx` ON `aiMemories` (`programId`,`status`,`updatedAt`);
--> statement-breakpoint
CREATE INDEX `ai_memory_retention_idx` ON `aiMemories` (`status`,`retentionUntil`,`id`);
