CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('approval_required','guardrail_blocked','finding_validated','scheduled_check') NOT NULL,
	`inAppEnabled` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preference_user_event_uq` UNIQUE(`userId`,`eventType`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workspaceId` int,
	`eventType` enum('approval_required','guardrail_blocked','finding_validated','scheduled_check') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notification_preference_user_idx` ON `notificationPreferences` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_created_idx` ON `notifications` (`userId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_workspace_created_idx` ON `notifications` (`workspaceId`,`createdAt`);