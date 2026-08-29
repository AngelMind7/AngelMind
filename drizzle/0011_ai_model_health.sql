ALTER TABLE `aiModels` ADD `lastHealthCheckAt` timestamp;--> statement-breakpoint
ALTER TABLE `aiModels` ADD `lastLatencyMs` int;--> statement-breakpoint
ALTER TABLE `aiModels` ADD `lastErrorCode` varchar(120);