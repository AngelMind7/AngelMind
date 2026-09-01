ALTER TABLE `evidenceArtifacts`
  ADD COLUMN `storageKey` varchar(512) NULL AFTER `artifactType`;

-- Existing rows may contain expiring signed URLs and are intentionally not guessed or
-- rewritten. New rows persist the stable object key; legacy rows continue to use
-- storageReference until migrated by an operator with bucket metadata.
-- checksum: evidenceArtifacts.storageKey:v1
