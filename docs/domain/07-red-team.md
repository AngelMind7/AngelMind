# Domain 07 — Red Team Operations

Blueprint V4 covers operation planning, C2 infrastructure, implant/beacon concepts, phishing/social-engineering exercises, physical-security exercises, lateral movement, exfiltration, persistence, evasion and OPSEC. fileciteturn136file7L485-L496

## Implemented contract
- Operation planning requires explicit objective, target allowlist, exclusions, timeline and rules of engagement.
- Approval workflow is explicit: draft → pending approval → approved → running/paused → completed/cancelled.
- Nine capability classes are modeled: C2, phishing, social engineering, physical, lateral movement, exfiltration, persistence, evasion and OPSEC.
- Implant/beacon/command lifecycle is represented as synthetic simulation resources only.
- Phishing campaign creation, delivery and click tracking are synthetic; credential collection is explicitly disabled.
- Results are synthetic evidence with a chain-of-custody reference.

## API surface
Operation planning:
- `GET/POST /api/v1/workspaces/:workspaceId/redteam/operations`
- `GET /api/v1/redteam/operations/:id`
- `POST /api/v1/redteam/operations/:id/request-approval`
- `POST /api/v1/redteam/operations/:id/approve`
- `POST /api/v1/redteam/operations/:id/status`
- `POST /api/v1/redteam/operations/:id/simulate`
- `GET /api/v1/redteam/c2/policy`

Synthetic implant/beacon lifecycle:
- `GET/POST /api/v1/redteam/implants`
- `GET /api/v1/redteam/implants/:id`
- `POST /api/v1/redteam/implants/:id/beacon`
- `POST /api/v1/redteam/implants/:id/command`
- `GET /api/v1/redteam/implants/:id/commands`

Synthetic phishing exercise:
- `POST /api/v1/redteam/phishing/campaigns`
- `GET /api/v1/redteam/phishing/campaigns/:id/stats`
- `POST /api/v1/redteam/phishing/campaigns/:id/send`
- `GET /api/v1/redteam/phishing/campaigns/:id/click`

## Safety boundary
Shared runtime execution is simulation-only. Target-facing C2, payload delivery, credential harvesting, persistence/evasion, lateral movement and exfiltration are not enabled as unrestricted operations. Every simulated capability requires an approved operation and validated allowlist. C2 is fail-closed with `targetExecutionEnabled: false`; phishing simulation returns `delivered: false` and `credentialCollection: false`.

## Verification
- `pnpm check:redteam-contract`
- `pnpm exec vitest run server/redteam-operations.test.ts`
- CI workflow: `.github/workflows/redteam-contract.yml`
