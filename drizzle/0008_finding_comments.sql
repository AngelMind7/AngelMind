CREATE TABLE `findingComments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `findingId` int NOT NULL,
  `workspaceId` int NOT NULL,
  `authorUserId` int NOT NULL,
  `body` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `findingComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `finding_comment_finding_created_idx` ON `findingComments` (`findingId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `finding_comment_workspace_idx` ON `findingComments` (`workspaceId`);
