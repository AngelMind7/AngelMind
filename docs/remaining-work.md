# AngelMind Remaining Work

This document is the active, non-authoritative execution queue. The authoritative requirement status is `docs/blueprint-coverage.md`; this file only groups the remaining work by delivery priority.

## P0 — Requires repository or deployment follow-up

- Complete distributed request/trace correlation across browser, API, worker, AI, and database records.
- Finish permission-aware global search UI and full cross-domain index coverage.
- Finish retest UI and the complete finding retest lifecycle.
- Complete asset lifecycle separation into scope, lifecycle, visibility, and operational states.
- Add graph nodes/edges/traversal for asset relationships and temporal provenance.
- Complete intelligence provider connector, scheduler, fetcher, deduplication, and correlation pipeline.
- Complete playbook matching, task generation, dependencies, and execution-state integration.

## P1 — Quality and production readiness

- Add automated accessibility scanning, route-level SEO metadata, robots, sitemap, canonical/OG/Twitter metadata, and structured data.
- Add CSS/initial-load/route-chunk/LCP/CLS/INP budgets and database load/query benchmarks.
- Add staging-to-production promotion, approval, health verification, and rollback workflow.
- Run an end-to-end backup/restore drill in an isolated recovery environment.
- Add distributed tracing, alerts, SLOs, error budgets, and queue/worker/AI latency dashboards.

## P2 — Product decisions or external providers

- Select and configure email delivery, payment/billing, entitlement, external integrations, and production AI providers.
- Complete MFA/passkey and connected-app recovery policy and implementation.
- Review legal text, retention, safe harbor, organization roles, and incident policy with the responsible owner.
