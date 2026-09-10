CREATE TABLE `reputationProfiles` (
  `userId` int NOT NULL,
  `totalPoints` int NOT NULL DEFAULT 0,
  `level` enum('contributor','practitioner','advanced','expert') NOT NULL DEFAULT 'contributor',
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  CONSTRAINT `reputation_profiles_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `reputationEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workspaceId` int NOT NULL,
  `userId` int NOT NULL,
  `eventType` enum('finding_validated','finding_resolved','evidence_verified','review_completed','research_completed') NOT NULL,
  `points` int NOT NULL,
  `referenceType` varchar(80),
  `referenceId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  CONSTRAINT `reputation_events_workspace_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reputation_events_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reputation_event_reference_uq` UNIQUE(`workspaceId`,`userId`,`eventType`,`referenceType`,`referenceId`),
  INDEX `reputation_event_workspace_created_idx` (`workspaceId`,`createdAt`),
  INDEX `reputation_event_user_idx` (`userId`,`createdAt`)
);
--> statement-breakpoint
CREATE TABLE `userAchievements` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `achievementKey` varchar(80) NOT NULL,
  `awardedAt` timestamp NOT NULL DEFAULT (now()),
  `metadata` text NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `user_achievements_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_achievement_uq` UNIQUE(`userId`,`achievementKey`),
  INDEX `user_achievement_awarded_idx` (`userId`,`awardedAt`)
);
