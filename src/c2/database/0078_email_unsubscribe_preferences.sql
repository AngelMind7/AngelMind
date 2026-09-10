CREATE TABLE `emailUnsubscribePreferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `category` enum('collaboration','notifications','marketing') NOT NULL,
  `unsubscribed` int NOT NULL DEFAULT 1,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `emailUnsubscribePreferences_id` PRIMARY KEY(`id`),
  CONSTRAINT `email_unsubscribe_user_category_uq` UNIQUE(`userId`,`category`)
);
--> statement-breakpoint
CREATE INDEX `email_unsubscribe_user_idx` ON `emailUnsubscribePreferences` (`userId`,`updatedAt`);
