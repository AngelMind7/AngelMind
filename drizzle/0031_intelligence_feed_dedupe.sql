ALTER TABLE `intelligenceFeedItems` ADD COLUMN `dedupeKey` varchar(64) NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE `intelligenceFeedItems` SET `dedupeKey` = SHA2(CONCAT(`workspaceId`, ':', `source`, ':', `assetRef`, ':', `observedAt`, ':', COALESCE(`reference`, ''), ':', `data`), 256) WHERE `dedupeKey` = '';
--> statement-breakpoint
CREATE UNIQUE INDEX `intelligence_feed_workspace_dedupe_uq` ON `intelligenceFeedItems` (`workspaceId`,`dedupeKey`);
