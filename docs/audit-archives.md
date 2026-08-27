# Signed Audit Archives

The Operations Console can package a workspace’s audit events, evidence references, run records, approval decisions, and in-app notifications into a JSON manifest. The server calculates a SHA-256 manifest digest and a domain-separated HMAC signature before storing the manifest in managed storage; the database keeps only the workspace-scoped storage reference, digest, signature, creator, and timestamp.

Verification retrieves the manifest from managed storage and recomputes both values. A mismatch returns `valid: false` and is recorded in the workspace audit trail. Archive creation and verification do not contact program targets.

Recovery is intentionally non-destructive: operators can view and verify a stored archive, while retention review continues to record expired-reference counts rather than automatically deleting evidence.
