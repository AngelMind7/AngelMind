ALTER TABLE `approvals`
  ADD COLUMN `contextJson` text NULL,
  ADD COLUMN `expiresAt` timestamp NULL;

--> statement-breakpoint
CREATE INDEX `approvals_expiry_idx` ON `approvals` (`status`, `expiresAt`);
