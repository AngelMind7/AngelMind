-- Optimistic concurrency for finding lifecycle and remediation writes.
ALTER TABLE `findings`
  ADD COLUMN `revision` int NOT NULL DEFAULT 0 AFTER `status`;
--> statement-breakpoint
CREATE INDEX `findings_workspace_revision_idx` ON `findings` (`workspaceId`,`revision`);
