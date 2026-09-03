ALTER TABLE `auditEvents` ADD COLUMN `traceId` varchar(128) NULL;
--> statement-breakpoint
CREATE INDEX `audit_trace_idx` ON `auditEvents` (`traceId`, `createdAt`);
