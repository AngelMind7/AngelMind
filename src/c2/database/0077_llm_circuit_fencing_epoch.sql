ALTER TABLE `llmProviderCircuitStates` ADD `coordinationEpoch` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `llmProviderCircuitStates` ADD `writerRegion` varchar(120);
