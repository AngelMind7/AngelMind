ALTER TABLE `researchSessions`
  ADD COLUMN `revision` int NOT NULL DEFAULT 0;

--> statement-breakpoint
ALTER TABLE `researchTasks`
  ADD COLUMN `revision` int NOT NULL DEFAULT 0;
