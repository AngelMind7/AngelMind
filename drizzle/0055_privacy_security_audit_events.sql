-- Record privacy request lifecycle events in the account security ledger.
ALTER TABLE `accountSecurityEvents` MODIFY COLUMN `eventType` enum('login','logout','token_rejected','password_reset_requested','mfa_enrolled','mfa_unenrolled','device_registered','device_revoked','profile_updated','privacy_export_requested','privacy_export_completed','privacy_delete_requested','privacy_delete_completed','privacy_delete_blocked') NOT NULL;

-- statement-breakpoint
UPDATE `__drizzle_migrations` SET `hash` = `hash` WHERE 1 = 0;

-- The no-op statement above keeps this migration compatible with the repository's
-- statement-breakpoint runner; migration identity is tracked by Drizzle journal.
