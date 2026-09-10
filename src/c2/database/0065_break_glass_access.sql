CREATE TABLE `breakGlassRequests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `requestedByUserId` int NOT NULL,
  `approvedByUserId` int,
  `revokedByUserId` int,
  `reason` text NOT NULL,
  `durationMinutes` int NOT NULL,
  `status` enum('requested','approved','revoked','expired') NOT NULL DEFAULT 'requested',
  `expiresAt` timestamp NOT NULL,
  `approvedAt` timestamp,
  `revokedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `breakGlassRequests_id` PRIMARY KEY(`id`),
  CONSTRAINT `breakGlassRequests_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `break_glass_workspace_status_idx` ON `breakGlassRequests` (`workspaceId`,`status`,`expiresAt`);
--> statement-breakpoint
CREATE INDEX `break_glass_requester_status_idx` ON `breakGlassRequests` (`requestedByUserId`,`status`,`expiresAt`);
