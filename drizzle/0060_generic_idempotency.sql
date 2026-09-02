CREATE TABLE `idempotencyRecords` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `scope` varchar(160) NOT NULL,
  `idempotencyKey` varchar(180) NOT NULL,
  `requestHash` varchar(64) NOT NULL,
  `status` enum('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
  `responsePayload` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  CONSTRAINT `idempotencyRecords_id` PRIMARY KEY(`id`),
  CONSTRAINT `idempotency_scope_key_uq` UNIQUE(`userId`,`scope`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `idempotency_expiry_idx` ON `idempotencyRecords` (`expiresAt`);
--> statement-breakpoint
CREATE INDEX `idempotency_user_created_idx` ON `idempotencyRecords` (`userId`,`createdAt`);
