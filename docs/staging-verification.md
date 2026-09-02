# Staging verification

This repository includes a guarded runner for the database integration contracts and the authenticated lifecycle browser contract. It is intentionally unable to run against a production environment or an internal Railway hostname.

## Database integration contracts

Create a dedicated Railway staging environment and attach a separate MySQL database. In the application service for that environment, set `DATABASE_URL` using a Railway variable reference such as:

```env
DATABASE_URL=${{MySQLStaging.MYSQL_URL}}
```

Run migrations only against that staging database, then run the guarded verification command:

```bash
pnpm db:push
ALLOW_STAGING_TESTS=true NODE_ENV=development pnpm test:staging
```

The command runs these contracts:

- `server/ai-memory-retention.integration.test.ts`
- `server/ai-memory-context.integration.test.ts`
- `server/global-search.integration.test.ts`

The runner refuses `NODE_ENV=production`, a URL containing `production`, and Railway's `mysql.railway.internal` hostname. It does not print the database URL or any secret.

## GitHub Actions workflow

The manual `Staging verification` workflow runs the same database contracts from GitHub Actions. Configure these secrets in the repository's `staging` environment:

- `STAGING_DATABASE_URL`: a public MySQL-compatible staging connection string; never use the production database or Railway's internal hostname.
- `STAGING_BASE_URL`: the HTTPS staging application URL.
- `ANGELMIND_E2E_TOKEN`: an authenticated, short-lived staging token.

Start **Actions → Staging verification → Run workflow**. Keep `apply_migrations` disabled for a normal verification run. Enable it only when the dedicated staging database is backed up or disposable and the migration change has been reviewed.

## Authenticated lifecycle E2E

Provide the staging URL and a short-lived authenticated token for a staging user:

```bash
ALLOW_STAGING_TESTS=true \
NODE_ENV=development \
DATABASE_URL="$DATABASE_URL" \
E2E_BASE_URL="https://staging.example.com" \
ANGELMIND_E2E_TOKEN="$ANGELMIND_E2E_TOKEN" \
pnpm test:staging
```

When both E2E variables are present, the runner executes the workspace → research session → asset → observation → finding contract. The test creates staging fixture data and should be run only against a disposable staging environment.

## Production safety

Do not copy a production password into chat, source control, or a local `.env` file. Use Railway variable references or a secret manager. If a database password has been exposed, rotate it before continuing.
