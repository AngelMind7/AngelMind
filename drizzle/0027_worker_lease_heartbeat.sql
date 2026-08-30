ALTER TABLE `jobs` ADD `leaseExpiresAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `heartbeatAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `workerId` varchar(128) NULL;
--> statement-breakpoint
CREATE INDEX `job_lease_expiry_idx` ON `jobs` (`status`,`leaseExpiresAt`);
