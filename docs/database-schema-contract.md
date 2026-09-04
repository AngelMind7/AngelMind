# AngelMind V4 — Database Contract

The V4 blueprint calls for a primary relational model of 50+ tables. The repository now has a concrete **74-table Drizzle schema** with an append-only migration history of **64 migration files**. The executable database layer remains Drizzle/MySQL-compatible rather than introducing a destructive ORM replacement.

## Concrete coverage

- Identity & security: users, profiles, devices, API keys, security events, MFA factors/recovery/challenges, onboarding.
- Organization & workspace: organizations, members, invitations, programs, entitlements, workspaces, workspace memberships, tags, tag assignments, notes, saved views, credentials, change snapshots.
- Research & intelligence: research sessions, assets, observations, hypotheses, tasks, task dependencies, failure observations, evolution snapshots, intelligence feed items, passive assets.
- Findings & evidence: findings, relations, retests, comments, evidence artifacts, provenance, research evidence links.
- AI & execution: AI models/runs/outputs/evaluations/memory, prompt versions, jobs, idempotency, outbox events/consumer receipts, playbooks/runs, execution runs.
- Governance & resilience: approvals, audit events/archives, restore drills, policy versions, incidents/reviews/evidence links, webhook activation.
- Notifications & delivery: notifications, preferences, notification deliveries, email deliveries, webhook configurations.
- Reporting & submissions: report versions/drafts, submissions, submission events.
- Knowledge graph: knowledge nodes and knowledge edges.

## Migration contract

1. `drizzle/schema.ts` is the source-of-truth table declaration.
2. Every declared table must have a corresponding `CREATE TABLE` in the append-only migration history.
3. The database contract gate requires at least 74 declared tables, at least 74 migrated tables, and at least 64 numbered migrations.
4. Migration safety, journal, and rollback checks remain mandatory in CI.
5. No destructive migration is accepted without explicit review evidence.

## Security invariants

1. Tenant/workspace boundaries are enforced before reads and writes.
2. Evidence preserves provenance and integrity metadata.
3. Execution records retain lifecycle state and actor information.
4. High-risk actions require policy and approval checks.
5. Secrets are stored masked/encrypted and never emitted into public evidence.
6. Migrations are append-only, journaled and rollback-reviewed.
