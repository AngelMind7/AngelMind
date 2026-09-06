CREATE TABLE `llmProviderCircuitStates` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` varchar(80) NOT NULL,
  `state` enum('closed','open','half_open') NOT NULL DEFAULT 'closed',
  `consecutiveFailures` int NOT NULL DEFAULT 0,
  `openedAt` timestamp NULL,
  `nextProbeAt` timestamp NULL,
  `probeLeaseUntil` timestamp NULL,
  `lastError` varchar(512),
  `lastAlertState` enum('closed','open','half_open'),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `llmProviderCircuitStates_id` PRIMARY KEY(`id`),
  CONSTRAINT `llm_provider_circuit_provider_uq` UNIQUE(`provider`)
);
--> statement-breakpoint
CREATE INDEX `llm_provider_circuit_state_probe_idx` ON `llmProviderCircuitStates` (`state`,`nextProbeAt`);
