# AngelMind Repository Release Gates

This checklist is the final repository gate before Railway/public deployment.

## Gate A — Source integrity

- [ ] `pnpm install --frozen-lockfile`
- [ ] typecheck
- [ ] unit/integration tests
- [ ] coverage gate
- [ ] production build
- [ ] bundle/PWA checks
- [ ] migration journal and rollback checks
- [ ] master specification contract
- [ ] canonical 17-tool runtime contract

## Gate B — Security boundary

- [ ] workspace authorization is enforced server-side
- [ ] allowlist and exclusions are enforced server-side
- [ ] target execution remains disabled by default
- [ ] active execution requires explicit deployment gate
- [ ] high/critical tools require an approved governance record
- [ ] approval is bound to workspace, tool, mode, scope digest, and target where applicable
- [ ] client input cannot manufacture scope validation or human approval
- [ ] prohibited execution categories remain disabled by default

## Gate C — Product vertical slice

- [ ] workspace can be created with policy/scope
- [ ] research session/task lifecycle is persisted
- [ ] tool catalog exposes canonical tools and status
- [ ] runtime adapter produces provenance/raw output
- [ ] observation/evidence promotion is persisted
- [ ] findings are created and reviewed
- [ ] reports compose from persisted evidence/findings
- [ ] audit records cover governance and workflow transitions

## Gate D — Deployment proof

These cannot be claimed from repository CI alone:

- [ ] Railway services deployed
- [ ] every required runtime image passes health checks
- [ ] externally licensed/vendor artifacts are actually installed where applicable
- [ ] production database backup/restore drill completed
- [ ] observability and alerting verified
- [ ] staging → production promotion verified
- [ ] live smoke test completed with an explicitly authorized test target

## Status semantics

`IMPLEMENTED` means repository code/tests support the contract.
`VERIFIED` means the repository contract has a passing automated check.
`DEPLOYED` means the behavior has been observed in the intended environment.

Never convert `VERIFIED` into `DEPLOYED` without deployment evidence.
