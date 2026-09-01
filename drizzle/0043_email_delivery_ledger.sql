CREATE TABLE `emailDeliveries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NULL,
  `workspaceId` int NULL,
  `recipient` varchar(320) NOT NULL,
  `templateKey` varchar(120) NOT NULL,
  `subject` varchar(512) NOT NULL,
  `payload` text NOT NULL,
  `status` enum('queued','sending','sent','failed') NOT NULL DEFAULT 'queued',
  `attempts` int NOT NULL DEFAULT 0,
  `nextAttemptAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `providerMessageId` varchar(512) NULL,
  `lastError` text NULL,
  `idempotencyKey` varchar(180) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `emailDeliveries_id` PRIMARY KEY(`id`),
  CONSTRAINT `email_delivery_idempotency_uq` UNIQUE(`idempotencyKey`)
);

CREATE INDEX `email_delivery_status_attempt_idx` ON `emailDeliveries` (`status`,`nextAttemptAt`);
CREATE INDEX `email_delivery_recipient_idx` ON `emailDeliveries` (`recipient`);
