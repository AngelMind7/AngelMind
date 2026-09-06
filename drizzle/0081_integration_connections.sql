CREATE TABLE `integrationConnections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `provider` enum('github','gitlab','slack','discord','custom') NOT NULL,
  `name` varchar(160) NOT NULL,
  `endpoint` varchar(512),
  `secretReference` varchar(512),
  `scopes` text NOT NULL,
  `status` enum('draft','connected','disabled') NOT NULL DEFAULT 'draft',
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `integration_connections_workspace_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `integration_workspace_provider_name_uq` UNIQUE(`workspaceId`,`provider`,`name`),
  INDEX `integration_workspace_status_idx` (`workspaceId`,`status`)
);
