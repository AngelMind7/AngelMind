CREATE TABLE `mfaFactors` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `type` enum('totp','webauthn') NOT NULL,
  `label` varchar(120) NOT NULL,
  `secretCiphertext` text,
  `credentialId` varchar(512),
  `publicKey` text,
  `counter` int DEFAULT 0 NOT NULL,
  `transports` text,
  `enabled` int DEFAULT 0 NOT NULL,
  `lastUsedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `mfaFactors_id` PRIMARY KEY(`id`),
  CONSTRAINT `mfa_factor_user_credential_uq` UNIQUE(`userId`,`credentialId`)
);
--> statement-breakpoint
CREATE INDEX `mfa_factor_user_enabled_idx` ON `mfaFactors` (`userId`,`enabled`);
--> statement-breakpoint
CREATE TABLE `mfaRecoveryCodes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `codeHash` varchar(64) NOT NULL,
  `usedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `mfaRecoveryCodes_id` PRIMARY KEY(`id`),
  CONSTRAINT `mfa_recovery_code_hash_uq` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE INDEX `mfa_recovery_user_used_idx` ON `mfaRecoveryCodes` (`userId`,`usedAt`);
--> statement-breakpoint
CREATE TABLE `mfaChallenges` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `type` enum('totp','registration','authentication') NOT NULL,
  `challenge` varchar(512) NOT NULL,
  `metadata` text NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `consumedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `mfaChallenges_id` PRIMARY KEY(`id`),
  CONSTRAINT `mfa_challenge_value_uq` UNIQUE(`challenge`)
);
--> statement-breakpoint
CREATE INDEX `mfa_challenge_user_type_expiry_idx` ON `mfaChallenges` (`userId`,`type`,`expiresAt`);
