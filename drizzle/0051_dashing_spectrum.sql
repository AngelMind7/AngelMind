ALTER TABLE `researchTasks`
  ADD `riskClass` enum('low','medium','high','critical') NOT NULL DEFAULT 'low',
  ADD `approvalStatus` enum('pending','approved','rejected','expired') NOT NULL DEFAULT 'approved',
  ADD `vectorKey` varchar(160),
  ADD `requiredCapabilities` text NULL,
  ADD `suggestedAdapters` text NULL,
  ADD `approvalId` int;
--> statement-breakpoint
UPDATE `researchTasks` SET `requiredCapabilities` = '[]' WHERE `requiredCapabilities` IS NULL;
--> statement-breakpoint
UPDATE `researchTasks` SET `suggestedAdapters` = '[]' WHERE `suggestedAdapters` IS NULL;
--> statement-breakpoint
ALTER TABLE `researchTasks`
  MODIFY `requiredCapabilities` text NOT NULL,
  MODIFY `suggestedAdapters` text NOT NULL;
--> statement-breakpoint
CREATE INDEX `research_task_approval_status_idx` ON `researchTasks` (`workspaceId`,`approvalStatus`,`riskClass`);
