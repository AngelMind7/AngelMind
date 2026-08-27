# Legal, Evidence, and Retention Controls

Each workspace must record a safe-harbor reference, a code-of-conduct record, an allowlist, and exclusions before a rehearsal can run. Exclusions always override allowlist matches. The system retains evidence metadata as a SHA-256 digest, timestamp, artifact type, and workspace-scoped storage reference.

Retention is configured per workspace. The scheduled administrative callback reviews retention windows, counts evidence references that have passed their retention window, and records this result in the audit trail; it does not delete artifacts automatically in this release. Any future purge implementation must be idempotent, auditable, scoped to the workspace, and separately reviewed because deletion is irreversible.

The dashboard never stores credential values. A credential record may only contain a workspace-specific secret reference managed by the deployment environment or an approved secret store.
