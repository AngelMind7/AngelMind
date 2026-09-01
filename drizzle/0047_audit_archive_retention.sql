ALTER TABLE `auditArchives`
  ADD COLUMN `immutableBatchKey` varchar(180) NOT NULL,
  ADD COLUMN `retentionUntil` timestamp NOT NULL,
  ADD COLUMN `verifiedAt` timestamp NULL,
  ADD COLUMN `lastRestoreDrillAt` timestamp NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_archive_immutable_batch_uq` ON `auditArchives` (`immutableBatchKey`);
--> statement-breakpoint
CREATE INDEX `audit_archive_retention_idx` ON `auditArchives` (`retentionUntil`);
