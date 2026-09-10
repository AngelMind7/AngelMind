CREATE TABLE `knowledgeNodes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `nodeType` enum('asset','observation','hypothesis','finding','intelligence','entity','document') NOT NULL,
  `externalId` varchar(160) NOT NULL,
  `label` varchar(240) NOT NULL,
  `properties` text NOT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `knowledgeNodes_id` PRIMARY KEY(`id`),
  CONSTRAINT `knowledgeNodes_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_node_workspace_external_uq` ON `knowledgeNodes` (`workspaceId`,`nodeType`,`externalId`);
--> statement-breakpoint
CREATE INDEX `knowledge_node_workspace_type_idx` ON `knowledgeNodes` (`workspaceId`,`nodeType`,`status`);
--> statement-breakpoint
CREATE INDEX `knowledge_node_workspace_updated_idx` ON `knowledgeNodes` (`workspaceId`,`updatedAt`);
--> statement-breakpoint
CREATE TABLE `knowledgeEdges` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `sourceNodeId` int NOT NULL,
  `targetNodeId` int NOT NULL,
  `relationType` varchar(80) NOT NULL,
  `confidence` int NOT NULL DEFAULT 100,
  `provenance` text NOT NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `knowledgeEdges_id` PRIMARY KEY(`id`),
  CONSTRAINT `knowledgeEdges_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `knowledgeEdges_sourceNodeId_knowledgeNodes_id_fk` FOREIGN KEY (`sourceNodeId`) REFERENCES `knowledgeNodes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `knowledgeEdges_targetNodeId_knowledgeNodes_id_fk` FOREIGN KEY (`targetNodeId`) REFERENCES `knowledgeNodes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_edge_pair_relation_uq` ON `knowledgeEdges` (`workspaceId`,`sourceNodeId`,`targetNodeId`,`relationType`);
--> statement-breakpoint
CREATE INDEX `knowledge_edge_workspace_relation_idx` ON `knowledgeEdges` (`workspaceId`,`relationType`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `knowledge_edge_source_idx` ON `knowledgeEdges` (`sourceNodeId`);
--> statement-breakpoint
CREATE INDEX `knowledge_edge_target_idx` ON `knowledgeEdges` (`targetNodeId`); 
