CREATE TABLE `searchDocuments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `entityType` varchar(60) NOT NULL,
  `entityId` int NOT NULL,
  `title` varchar(512) NOT NULL,
  `body` text NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `searchDocuments_id` PRIMARY KEY(`id`),
  CONSTRAINT `search_document_entity_uq` UNIQUE(`workspaceId`,`entityType`,`entityId`),
  CONSTRAINT `searchDocuments_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `search_document_workspace_updated_idx` ON `searchDocuments` (`workspaceId`,`updatedAt`);
