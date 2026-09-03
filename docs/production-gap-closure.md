# Production Gap Closure Record

This record reconciles the master specification with the current implementation without claiming controls that require a live production environment.

## Repository layout decision

The repository uses a modular monolith layout (`client/`, `server/`, `shared/`, `drizzle/`, `runtime/`, and `research-service/`) rather than duplicating code into `apps/`, `packages/`, `database/`, and `tool-registry/`. Domain boundaries are preserved by server modules and package-level contracts. New code must remain in the existing layout unless a migration plan is approved; empty compatibility directories are not created merely to satisfy a textual tree.

## Database decision

The current schema is an evolved superset of the original 27-table baseline. The migration journal and safety/rollback checks are the source of truth for deployed schema evolution. Tenant-sensitive records must retain workspace/organization ownership and be covered by the database policy review before production promotion. A live RLS verification requires a real database deployment and is intentionally not represented by a fixture.

## Tool runtime decision

The default production image remains passive-only. `Dockerfile.tools` is an opt-in runtime image that installs pinned open-source tools and runs a harmless version smoke test. Licensed or custom adapters are represented as `external_artifact` requirements; the repository never creates fake executables or reports catalog entries as operational. Scope, policy, rate, sandbox, and human approval checks remain mandatory at execution time.

## Backup and restore evidence contract

A restore drill is complete only when the operator records the backup/archive identifier, timestamp, owner, source checksum, restored database row-count reconciliation, restored object checksum, RTO, RPO, and a pass/fail decision in the restore ledger. Until a scheduled environment produces those values, the release status is **restore-ready but not restore-proven**.

## Release gate

A release may claim test/build readiness when `pnpm test`, `pnpm check`, and `pnpm build` are green. It may claim production readiness only after live database policy verification, authorized runtime smoke tests, backup/object restore evidence, and staging E2E verification are attached to the release.
