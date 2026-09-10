ALTER TABLE `outboxEvents` MODIFY COLUMN `status` enum('pending','retrying','published','failed') NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `outboxEvents` ADD COLUMN `availableAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE `outboxEvents` ADD COLUMN `lockedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `outboxEvents` ADD COLUMN `workerId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `outboxEvents` ADD COLUMN `lastError` text NULL;
--> statement-breakpoint
CREATE INDEX `outbox_event_status_available_idx` ON `outboxEvents` (`status`,`availableAt`);
--> statement-breakpoint
CREATE INDEX `outbox_event_worker_lease_idx` ON `outboxEvents` (`workerId`,`lockedAt`);
