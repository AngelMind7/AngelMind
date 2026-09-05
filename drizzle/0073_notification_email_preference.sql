ALTER TABLE `notificationPreferences`
  ADD COLUMN `emailEnabled` int NOT NULL DEFAULT 1 AFTER `inAppEnabled`;
