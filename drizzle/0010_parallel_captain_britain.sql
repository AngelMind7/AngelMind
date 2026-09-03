CREATE TABLE `submissionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`fromStatus` enum('submitted','acknowledged','triaged','accepted','rejected','duplicate','resolved','retest'),
	`toStatus` enum('submitted','acknowledged','triaged','accepted','rejected','duplicate','resolved','retest') NOT NULL,
	`note` text,
	`changedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissionEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`reportVersionId` int NOT NULL,
	`platform` enum('hackerone','bugcrowd','intigriti','markdown') NOT NULL,
	`externalReference` varchar(240),
	`status` enum('submitted','acknowledged','triaged','accepted','rejected','duplicate','resolved','retest') NOT NULL DEFAULT 'submitted',
	`submittedByUserId` int NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `submission_event_submission_created_idx` ON `submissionEvents` (`submissionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `submission_event_workspace_idx` ON `submissionEvents` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `submission_finding_created_idx` ON `submissions` (`findingId`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `submission_workspace_status_idx` ON `submissions` (`workspaceId`,`status`);
