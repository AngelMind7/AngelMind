ALTER TABLE `jobs` ADD `traceId` varchar(128);
--> statement-breakpoint
CREATE INDEX `job_trace_idx` ON `jobs` (`traceId`);
--> statement-breakpoint
ALTER TABLE `outboxEvents` ADD `traceId` varchar(128);
--> statement-breakpoint
CREATE INDEX `outbox_event_trace_idx` ON `outboxEvents` (`traceId`);
