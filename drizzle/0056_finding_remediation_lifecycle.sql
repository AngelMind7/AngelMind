-- Governed finding notification/remediation/retest lifecycle.
ALTER TABLE `findings`
  ADD COLUMN `severity` enum('informational','low','medium','high','critical') NOT NULL DEFAULT 'medium' AFTER `title`,
  ADD COLUMN `clientNotifiedAt` timestamp NULL AFTER `humanReviewStatus`,
  ADD COLUMN `remediationDeadline` timestamp NULL AFTER `clientNotifiedAt`,
  ADD COLUMN `remediationOwnerUserId` int NULL AFTER `remediationDeadline`,
  ADD COLUMN `remediationNotes` text NULL AFTER `remediationOwnerUserId`,
  ADD COLUMN `resolvedAt` timestamp NULL AFTER `remediationNotes`;
--> statement-breakpoint
ALTER TABLE `findings`
  MODIFY COLUMN `status` enum('discovered','triaged','candidate','reproducing','validated','reported','notified','remediation','retest','resolved','reopened','false_positive','submitted','invalid','duplicate','inconclusive') NOT NULL DEFAULT 'discovered';
--> statement-breakpoint
CREATE INDEX `findings_workspace_remediation_idx` ON `findings` (`workspaceId`,`remediationDeadline`);
--> statement-breakpoint
CREATE INDEX `findings_remediation_owner_status_idx` ON `findings` (`remediationOwnerUserId`,`status`);
--> statement-breakpoint
ALTER TABLE `findingRetests` ADD COLUMN `startedAt` timestamp NULL AFTER `reviewedByUserId`;
