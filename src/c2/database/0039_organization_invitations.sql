CREATE TABLE IF NOT EXISTS `organizationInvitations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organizationId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `role` enum('admin','researcher','reviewer','auditor') NOT NULL,
  `tokenHash` varchar(64) NOT NULL,
  `status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
  `invitedByUserId` int NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `acceptedByUserId` int,
  `acceptedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `organization_invitations_id` PRIMARY KEY(`id`),
  CONSTRAINT `organization_invite_token_uq` UNIQUE(`tokenHash`),
  INDEX `organization_invite_status_idx` (`organizationId`,`status`),
  INDEX `organization_invite_email_idx` (`email`,`status`),
  CONSTRAINT `organization_invitations_organization_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
);

-- Invitation tokens are stored only as SHA-256 hashes; raw tokens are returned once to the caller.
-- checksum: organizationInvitations:v1
