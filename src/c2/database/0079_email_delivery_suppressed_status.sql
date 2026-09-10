ALTER TABLE `emailDeliveries` MODIFY COLUMN `status` enum('queued','sending','sent','failed','suppressed') NOT NULL DEFAULT 'queued';
