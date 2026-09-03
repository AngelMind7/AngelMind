# AngelMind production readiness checklist

This checklist separates repository-complete work from checks that require a real staging or production environment. It is intended to prevent a passing local build from being mistaken for a verified live deployment.

## Repository gates

| Gate                                                 | Status     | Evidence                        |
| ---------------------------------------------------- | ---------- | ------------------------------- |
| TypeScript check                                     | Complete   | `pnpm check`                    |
| Unit/integration contracts without external database | Complete   | `pnpm test`                     |
| Production build                                     | Complete   | `pnpm build`                    |
| Migration safety                                     | Complete   | `pnpm check:migration-safety`   |
| Migration rollback contract                          | Complete   | `pnpm check:migration-rollback` |
| Bundle budget and provider-neutral checks            | CI-covered | `.github/workflows/ci.yml`      |
| Public accessibility and safety E2E                  | CI-covered | `.github/workflows/e2e.yml`     |
| Governed adapter lifecycle and provenance contract   | Complete   | `pnpm check:execution-contract` |
| Latest migration journal/safety/rollback checks      | Complete   | `pnpm check:migration-journal`  |

## Staging gates

| Gate                                        | Required action                                          | Status                 |
| ------------------------------------------- | -------------------------------------------------------- | ---------------------- |
| Dedicated MySQL-compatible staging database | Set `DATABASE_URL` through Railway variable reference    | Pending environment    |
| Schema migration rehearsal                  | Run `pnpm db:push` only in staging                       | Pending environment    |
| AI memory retention integration             | Run `server/ai-memory-retention.integration.test.ts`     | Pending environment    |
| AI memory context integration               | Run `server/ai-memory-context.integration.test.ts`       | Pending environment    |
| Semantic search integration                 | Run `server/global-search.integration.test.ts`           | Pending environment    |
| Authenticated lifecycle E2E                 | Set `E2E_BASE_URL` and short-lived `ANGELMIND_E2E_TOKEN` | Pending environment    |
| Health/readiness/metrics                    | Run post-deploy verification workflow                    | Pending deployment     |
| Restore rehearsal                           | Restore a staging backup and record RTO/RPO              | Pending backup         |
| Provider probes                             | Configure HTTPS probe URLs and verify alert delivery     | Pending provider setup |

Use the guarded local runner after staging is provisioned:

```bash
ALLOW_STAGING_TESTS=true NODE_ENV=development pnpm test:staging
```

The runner refuses production-looking database URLs, Railway's internal hostname, and production mode.

## Production integration gates

| Area              | Required action                                                        | Status                                  |
| ----------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| Billing           | Select provider, configure checkout/webhooks/entitlements/refunds      | Blocked on provider decision            |
| Email             | Configure SMTP/provider, sender domain, SPF/DKIM/DMARC, unsubscribe    | Blocked on provider credentials         |
| Deployment        | Deploy frontend, API, worker, and scheduler with reviewed secrets      | Blocked on deployment access            |
| Database          | Apply reviewed migrations to production with backup and rollback plan  | Owner-approved operation                |
| Monitoring        | Configure collection, alert rules, SLO dashboard, and escalation owner | Pending operations setup                |
| Disaster recovery | Complete live backup/restore drill and retain evidence                 | Pending backup access                   |
| Security          | Rotate exposed credentials and verify secret manager boundaries        | Required before production verification |

## Safety rules

Never use a production database for integration fixtures. Never put database passwords, Firebase private keys, Supabase service-role keys, SMTP passwords, or E2E tokens in Git, chat, issue descriptions, or command output. If a credential has been exposed, rotate it before staging or production verification.
