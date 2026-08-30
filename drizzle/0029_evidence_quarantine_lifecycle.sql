ALTER TABLE `evidenceArtifacts` ADD `status` enum('quarantined','scanned','promoted','rejected') NOT NULL DEFAULT 'quarantined';
--> statement-breakpoint
ALTER TABLE `evidenceArtifacts` ADD `contentType` varchar(160);
--> statement-breakpoint
ALTER TABLE `evidenceArtifacts` ADD `sizeBytes` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `evidenceArtifacts` ADD `quarantineReason` text;
--> statement-breakpoint
ALTER TABLE `evidenceArtifacts` ADD `scannedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `evidenceArtifacts` ADD `promotedAt` timestamp NULL;
