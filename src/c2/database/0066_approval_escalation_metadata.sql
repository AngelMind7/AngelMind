ALTER TABLE `approvals`
  ADD COLUMN `escalationCount` int NOT NULL DEFAULT 0,
  ADD COLUMN `escalatedByUserId` int,
  ADD COLUMN `escalatedAt` timestamp;
