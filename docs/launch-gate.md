# AngelMind Launch Gate

This checklist is the final gate between repository completion and external infrastructure activation.

## GitHub gate

- [ ] `pnpm check`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e`
- [ ] migration journal/safety/rollback checks
- [ ] master contract check
- [ ] tool runtime contract check
- [ ] execution contract check
- [ ] provider-neutral check
- [ ] UUID/buffer usage check
- [ ] container workflow green
- [ ] accessibility workflow green
- [ ] security/code scanning green
- [ ] staging verification green
- [ ] verified immutable image promotion workflow green (staging health/readiness, expected commit, SBOM/scan/signature evidence)
- [ ] no secrets committed
- [ ] production configuration documented with secret placeholders only

## Infrastructure gate

### Supabase

- PostgreSQL migrations applied
- RLS/tenant isolation verified
- Auth providers configured
- Realtime subscriptions verified
- backup/PITR policy verified

### Railway

- API service healthy on `/health`
- worker service healthy
- Python/report service healthy if enabled
- Redis/BullMQ healthy
- environment variables configured through Railway secrets
- rolling deployment verified

### Cloudflare

- Pages deployment healthy
- Worker routes healthy
- R2 private buckets configured
- KV/D1 bindings verified
- Turnstile configured on public authentication surfaces
- security headers and custom domains verified

### Firebase

- FCM credentials/configured service identity
- notification delivery verified
- Firestore only used for explicitly defined operational/cache workloads
- Cloud Functions triggers verified if enabled

## Launch decision

**LAUNCHABLE** means all required gates above are green and the production smoke test succeeds. If any required gate is red, the system remains in staging and the failing gate is documented.
