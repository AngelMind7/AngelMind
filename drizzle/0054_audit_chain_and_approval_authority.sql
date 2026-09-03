-- P5: audit hash chain (previousEntryHash + chainHash)
ALTER TABLE `auditEvents` ADD COLUMN `previousEntryHash` varchar(64) NULL AFTER `evidenceHash`;
--> statement-breakpoint
ALTER TABLE `auditEvents` ADD COLUMN `chainHash` varchar(64) NULL AFTER `previousEntryHash`;
--> statement-breakpoint

-- P6: role approval_authority pada workspace membership
ALTER TABLE `workspaceMemberships` MODIFY COLUMN `role` enum('owner','operator','reviewer','auditor','approval_authority') NOT NULL;
--> statement-breakpoint

CREATE INDEX `audit_events_chain_hash_idx` ON `auditEvents` (`chainHash`);
