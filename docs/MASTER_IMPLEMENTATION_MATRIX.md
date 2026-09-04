# Master Implementation Matrix

This document tracks implementation against the AngelMind master specification. It is an engineering matrix, not a production-deployment claim.

## Verification semantics

- `VERIFIED`: automated repository contract/tests pass.
- `DEPLOYED`: observed in the intended runtime environment.

Repository work must not claim deployment evidence that does not exist.

## Implementation progress

The repository has a server-side governed capability execution boundary: capability resolution selects a registered primary/fallback adapter, adapter health is checked before execution, the exact selected tool is authorized against workspace scope and approval state, and only authorization-derived `scopeValidated`/`humanApproval` values reach the runtime pipeline. The canonical 19-state execution path is exposed by the orchestration service. A durable execution ledger persists that path in the existing job store with workspace authorization, idempotent creation, revision tracking, and concurrency-safe advancement.

Governed execution binds durable state to queue, worker, parser, normalizer, observation, evidence, finding, and correlation milestones. The assurance layer now validates the evidence chain, derives evidence-backed impact proof, and generates a deterministic report artifact that remains explicitly review-gated; direct submission is never permitted by that layer. The governed execution service advances the ledger through `CHAIN_VALIDATION`, `IMPACT_PROOF`, and `REPORT_GENERATION` only when the required correlated finding and evidence chain are present.

A runtime resource policy module defines bounded input, timeout, output, concurrency, and privileged-runtime limits. Existing runtime execution already enforces bounded timeout/output and the target-execution fail-closed gate; integration of the new concurrency/resource policy into the process runner remains a separate wiring task.

A deterministic recovery planner now defines restart/lease-expiry behavior from durable execution checkpoints. It resumes safe non-terminal checkpoints, finalizes a worker checkpoint when runtime completion is already known, retries failed or expired workers, and holds active workers to avoid duplicate execution. The planner is side-effect free and covered by regression tests.

## Current execution chain

`Capability → Adapter Selection → Health → Authorization → Durable Ledger → Runtime → Parse → Normalize → Observation → Evidence → Finding → Correlation → Chain Validation → Impact Proof → Report Generation`

`Submission → DONE` remains intentionally outside the automatic execution path. Reports are review-gated and target-facing submission is not an automatic consequence of correlation.

## Next implementation gates

1. Persist/report assurance artifacts through the existing control-plane/storage layer where the schema supports them, with reviewer provenance.
2. Bind the recovery planner to the durable worker loop and execution ledger without duplicating runtime work.
3. Wire the runtime resource/concurrency policy into the process runner without weakening fail-closed authorization.
4. Realtime progress and dashboard consumption of persisted execution truth.
5. Final repository-wide blueprint audit, contract tests, and CI verification before deployment work.

Deployment and Railway/Supabase/Firebase configuration remain intentionally out of scope until the GitHub implementation pass is complete.
