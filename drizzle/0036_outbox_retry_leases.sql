ALTER TABLE `outboxEvents` MODIFY COLUMN `status` enum('pending','retrying','published','failed') NOT NULL DEFAULT 'pending';
ALTER TABLE `outboxEvents` ADD COLUMN `availableAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `outboxEvents` ADD COLUMN `lockedAt` timestamp NULL;
ALTER TABLE `outboxEvents` ADD COLUMN `workerId` varchar(128) NULL;
ALTER TABLE `outboxEvents` ADD COLUMN `lastError` text NULL;
CREATE INDEX `outbox_event_status_available_idx` ON `outboxEvents` (`status`,`availableAt`);
CREATE INDEX `outbox_event_worker_lease_idx` ON `outboxEvents` (`workerId`,`lockedAt`);
