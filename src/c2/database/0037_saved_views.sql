CREATE TABLE `savedViews` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(120) NOT NULL,
  `query` varchar(512) NOT NULL,
  `filters` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `savedViews_id` PRIMARY KEY(`id`),
  CONSTRAINT `saved_view_workspace_user_name_uq` UNIQUE(`workspaceId`,`userId`,`name`),
  CONSTRAINT `savedViews_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade,
  CONSTRAINT `savedViews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_view_workspace_user_updated_idx` ON `savedViews` (`workspaceId`,`updatedAt`);
