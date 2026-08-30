CREATE TABLE `outboxConsumerReceipts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` int NOT NULL,
  `consumerKey` varchar(160) NOT NULL,
  `processedAt` timestamp NOT NULL DEFAULT (now()),
  `resultHash` varchar(64),
  CONSTRAINT `outboxConsumerReceipts_id` PRIMARY KEY(`id`),
  CONSTRAINT `outbox_consumer_event_uq` UNIQUE(`eventId`,`consumerKey`),
  CONSTRAINT `outboxConsumerReceipts_eventId_outboxEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `outboxEvents`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `outbox_consumer_processed_idx` ON `outboxConsumerReceipts` (`consumerKey`,`processedAt`);
