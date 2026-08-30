# AngelMind Remaining Work

This document is the active execution queue. The authoritative requirement status remains `docs/blueprint-coverage.md`; this file tracks only work that is still genuinely incomplete or requires a live environment.

## A/B — Repository work still to complete

| Priority | Work item | Current boundary |
|---|---|---|
| P0 | Apply the registry selector to every direct `invokeLLM` path and add capability-aware gateway fallback. | Durable AI runs already route through the selector; direct control-plane inference still needs consolidation. |
| P0 | Enforce composite workspace consistency at the database boundary. | Application checks exist; all parent-child relations do not yet have composite constraints. |
| P1 | Persist and expose the generic knowledge graph. | Deterministic graph utilities exist; entity persistence, graph API, provenance traversal, and UI are incomplete. |
| P1 | Complete end-to-end trace graph correlation. | Request and AI trace IDs exist; all research/evidence/finding/report lifecycle records are not yet correlated automatically. |
| P1 | Complete worker and outbox operational semantics. | Lease, heartbeat, stale recovery, and consumer receipts exist; live heartbeat ownership, consumer replay, and cross-worker integration tests remain. |
| P1 | Complete evidence security scanning. | Quarantine, scan state, promote/reject, and audit exist; a real MIME/content/malware scanner adapter is not configured. |
| P1 | Complete permission-aware ranked search. | Workspace search index exists; full cross-domain ranking, freshness, deduplication, and semantic search remain. |
| P1 | Complete intelligence ingestion. | Normalization and persistence exist; provider adapters, fetch scheduling, deduplication, correlation, and graph ingestion remain. |
| P1 | Complete playbook execution. | Versioned playbooks and matching exist; task generation, dependency execution, status feedback, and retry integration remain. |
| P2 | Complete auth and UI quality contracts. | Firebase foundation and UI primitives exist; MFA/passkey/recovery E2E, automated accessibility, load/performance, and critical-path E2E remain. |

## C — Live environment work

These items require access to the user's real Railway, Firebase, Supabase, GitHub, database, or gateway accounts: configure secrets, choose the database dialect, apply migrations after backup and preflight, deploy web/API/worker, configure Firebase domains/providers, configure Supabase Storage, connect 9Router/OmniRoute keys, enable GitHub branch protections, and run staging/production smoke tests.

## D — Product, security, legal, and operations decisions

These items require owner approval: AI model/cost/retention policy, role and MFA policy, data retention and residency, legal terms and safe harbor, provider selection for email/payment/scanning/intelligence, incident severity, SLO/RTO/RPO, release ownership, and Tier 3 approval rules.
