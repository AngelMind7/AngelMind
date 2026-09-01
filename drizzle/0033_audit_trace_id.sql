ALTER TABLE `auditEvents` ADD COLUMN `traceId` varchar(128) NULL;
CREATE INDEX `audit_trace_idx` ON `auditEvents` (`traceId`, `createdAt`);
