CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64),
	`avatarReference` varchar(512),
	`bio` text NOT NULL,
	`specialization` varchar(160),
	`skills` text NOT NULL,
	`experience` text NOT NULL,
	`visibility` enum('private','organization','public') NOT NULL DEFAULT 'organization',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profile_user_uq` UNIQUE(`userId`),
	CONSTRAINT `user_profile_username_uq` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `user_profile_visibility_idx` ON `userProfiles` (`visibility`,`updatedAt`);