## Change summary

Describe what changed and why.

## Blueprint alignment

- [ ] The change maps to a documented blueprint section.
- [ ] Public and authenticated data boundaries remain isolated.
- [ ] Workspace, role, policy, budget, and audit checks remain upstream of state changes.
- [ ] No active target interaction, exploitation, credential replay, or autonomous submission was added.

## Verification

- [ ] `pnpm check`
- [ ] `pnpm test -- --run`
- [ ] Python safety tests, if `research-service/` changed
- [ ] `git diff --check`

## Evidence and rollback

Describe tests, screenshots, migration notes, or rollback steps when applicable.
