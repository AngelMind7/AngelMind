CREATE TABLE `notificationDeliveries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `notificationId` int NOT NULL,
  `userId` int NOT NULL,
  `workspaceId` int,
  `channel` enum('in_app','email','webhook') NOT NULL,
  `status` enum('queued','sending','sent','failed','disabled') NOT NULL DEFAULT 'queued',
  `idempotencyKey` varchar(180) NOT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `nextAttemptAt` timestamp NOT NULL DEFAULT (now()),
  `providerMessageId` varchar(512),
  `lastError` text,
  `redactedPayload` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  CONSTRAINT `notificationDeliveries_id` PRIMARY KEY(`id`),
  CONSTRAINT `notification_delivery_idempotency_uq` UNIQUE(`idempotencyKey`),
  CONSTRAINT `notification_delivery_channel_uq` UNIQUE(`notificationId`,`channel`),
  CONSTRAINT `notificationDeliveries_notificationId_notifications_id_fk` FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `notificationDeliveries_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX `notification_delivery_status_attempt_idx` ON `notificationDeliveries` (`status`,`nextAttemptAt`);
--> statement-breakpoint
CREATE INDEX `notification_delivery_workspace_created_idx` ON `notificationDeliveries` (`workspaceId`,`createdAt`);
