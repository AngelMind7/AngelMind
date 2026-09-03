# AngelMind Release Checklist

This checklist is the release gate for `main`. A checkbox is complete only when the linked command or workflow produces evidence for the exact release commit. Manual environment prerequisites must be recorded as blocked, not silently treated as passed.

## Automated gates

- [ ] Confirm the release commit is on `main` and the working tree is clean: `git status --short --branch`.
- [ ] Run `pnpm check:master-contract` for route, tool, evidence, correlation, API, migration, and runtime safety coverage.
- [ ] Run `pnpm check:migration-journal`.
- [ ] Run `pnpm check:migration-safety`.
- [ ] Run `pnpm check:migration-rollback`.
- [ ] Run `pnpm check` for TypeScript type safety.
- [ ] Run `pnpm test -- --reporter=dot` and retain the pass/skip counts.
- [ ] Run `pnpm build`, `pnpm check:budget`, and PWA manifest validation.
- [ ] Run `pnpm test:python` and `pnpm lint:python` for the research foundation.
- [ ] Confirm the `CI`, `CodeQL`, `Security posture`, and `Container build` workflows are green for the exact SHA.
- [ ] Confirm the Container build workflow executed `Dockerfile.tools` and the adapter smoke entrypoint, not only the production image build.

## Database and recovery gates

- [ ] Review migration SQL and run the migration process against a dedicated staging database first.
- [ ] Run database integration contracts with `DATABASE_URL` pointing to ephemeral or staging infrastructure.
- [ ] Verify workspace consistency and orphan-data checks before applying foreign keys.
- [ ] Create a signed audit archive in a test workspace.
- [ ] Verify archive integrity and record the archive ID, manifest hash, signature result, owner, and retention decision.
- [ ] Run `operations.runRestoreDrill` in plan-only mode and retain evidence with checksums, records checked, RTO, RPO, and `mutationPerformed=false`.
- [ ] Confirm rollback application commit and forward-migration/restoration plan are documented; never perform blind database rollback.

## Security and product gates

- [ ] Review changed threat-model rows and assign an owner for every High residual risk.
- [ ] Confirm workspace scope, exclusions, safe harbor, code of conduct, budget, session limit, cooldown, retention, and timezone.
- [ ] Confirm target-facing tools remain disabled unless a separate authorized capability review has passed.
- [ ] Confirm external artifacts (Burp, SSRFmap, GraphQL-Cop) are either supplied with provenance/checksum or remain unavailable; never substitute fake executables.
- [ ] Run authenticated browser smoke and accessibility checks against a non-production HTTPS staging URL when staging credentials are configured.
- [ ] Verify provider probes, SLO budgets, notification policy, and audit redaction in the deployed environment.

## Promotion record

| Field | Value |
|---|---|
| Release commit |  |
| Release owner |  |
| Reviewer |  |
| CI run URL |  |
| Container smoke run URL |  |
| Staging URL |  |
| Migration review |  |
| Restore-drill evidence ID |  |
| Rollback commit |  |
| Unresolved residual risk |  |
| Promotion decision |  |

A release is **not complete** while a required automated gate is red or while a staging/production prerequisite is missing. In that case the promotion decision must be `blocked` and the missing prerequisite must be named.
