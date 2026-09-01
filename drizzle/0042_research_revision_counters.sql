ALTER TABLE `researchSessions`
  ADD COLUMN `revision` int NOT NULL DEFAULT 0;

ALTER TABLE `researchTasks`
  ADD COLUMN `revision` int NOT NULL DEFAULT 0;
