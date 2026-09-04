# Master Implementation Matrix

This document tracks implementation against the AngelMind master specification. It is an engineering matrix, not a production-deployment claim.

## Verification semantics

- `VERIFIED`: automated repository contract/tests pass.
- `DEPLOYED`: observed in the intended runtime environment.

Repository work must not claim deployment evidence that does not exist.

## Implementation progress

The repository now has a server-side governed capability execution boundary: capability resolution selects a registered primary/fallback adapter, adapter health is checked before execution, the exact selected tool is authorized against workspace scope and approval state, and only the authorization-derived `scopeValidated`/`humanApproval` values reach the runtime pipeline. The canonical 19-state execution path is exposed by the orchestration service. A durable execution ledger now persists that canonical path in the existing job store with workspace authorization, idempotent creation, revision tracking, and concurrency-safe state advancement. Governed execution now creates that ledger only after authorization and binds the durable state to queue, worker, parser, normalizer, observation, evidence, finding, and correlation milestones. Normalized observations and correlation findings retain request/trace provenance.

The remaining integration work is to bind later ledger transitions (chain validation, impact proof, report generation, submission, and DONE) to their actual runtime services, rather than marking them complete without persisted evidence. Evidence persistence and correlation are now represented by explicit ledger milestones when the corresponding pipeline outputs exist.

## Current execution chain

`Capability → Adapter Selection → Health → Authorization → Durable Ledger → Runtime → Parse → Normalize → Observation → Evidence → Finding → Correlation`

The runtime remains fail-closed for target execution unless the explicit target-execution environment gate is enabled. High/critical tools require server-side approval validation; AI/planning layers are not execution authority.

## Next implementation gates

1. Bind chain validation and impact-proof transitions to persisted evidence validation.
2. Bind report generation and submission transitions to actual report/delivery services.
3. Queue/worker handoff and recovery semantics across every execution path.
4. Sandbox/resource controls around tool processes.
5. Realtime progress and dashboard consumption of persisted execution truth.

Deployment and Railway evidence remain intentionally out of scope for this GitHub implementation pass.
