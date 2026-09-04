# Master Implementation Matrix

This document tracks implementation against the AngelMind master specification. It is an engineering matrix, not a production-deployment claim.

## Verification semantics

- `VERIFIED`: automated repository contract/tests pass.
- `DEPLOYED`: observed in the intended runtime environment.

Repository work must not claim deployment evidence that does not exist.

## Implementation progress

The repository has a server-side governed capability execution boundary: capability resolution selects a registered primary/fallback adapter, adapter health is checked before execution, the exact selected tool is authorized against workspace scope and approval state, and only authorization-derived `scopeValidated`/`humanApproval` values reach the runtime pipeline. The canonical 19-state execution path is exposed by the orchestration service. A durable execution ledger persists that path in the existing job store with workspace authorization, idempotent creation, revision tracking, and concurrency-safe advancement.

Governed execution binds durable state to queue, worker, parser, normalizer, observation, evidence, finding, and correlation milestones. The assurance layer validates the evidence chain, derives evidence-backed impact proof, and generates a deterministic report artifact that remains explicitly review-gated; direct submission is never permitted by that layer. The governed execution service persists the assurance report into the durable execution ledger and existing finding report-draft storage, then closes the execution job without advancing into automatic submission.

A runtime resource policy module defines bounded input, timeout, output, concurrency, and privileged-runtime limits. The governed pipeline now routes every registered-tool execution through that policy and a bounded in-process concurrency gate; the underlying runtime retains its own fail-closed authorization and target-execution gate.

A deterministic recovery planner defines restart/lease-expiry behavior from durable execution checkpoints. It resumes safe non-terminal checkpoints, finalizes a worker checkpoint when runtime completion is already known, retries failed or expired workers, and holds active workers to avoid duplicate execution. The planner is side-effect free and covered by regression tests. The durable job store already provides lease/heartbeat/claim/retry/dead-letter primitives used by the platform queue.

Execution-ledger transitions now publish idempotent realtime progress events through the existing outbox/event transport. The authenticated realtime hook exposes those events to dashboard consumers, and Mission Control renders the latest governed execution state, capability, tool, revision, and realtime connection status.

## Current execution chain

`Capability → Adapter Selection → Health → Authorization → Durable Ledger → Runtime Resource Gate → Runtime → Parse → Normalize → Observation → Evidence → Finding → Correlation → Chain Validation → Impact Proof → Report Generation`

`Submission → DONE` remains intentionally outside the automatic execution path. Reports are review-gated and target-facing submission is not an automatic consequence of correlation.

## Remaining repository gate

1. Final repository-wide blueprint audit, contract tests, and CI verification before deployment work.

Deployment and Railway/Supabase/Firebase/Cloudflare configuration remain intentionally out of scope until the GitHub implementation pass is complete.
