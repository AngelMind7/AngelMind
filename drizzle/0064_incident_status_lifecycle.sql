ALTER TABLE `incidents` MODIFY COLUMN `status` enum('open','acknowledged','investigating','escalated','resolved','closed') NOT NULL DEFAULT 'open';--> statement-breakpoint
