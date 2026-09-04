# Domain 07 — Red Team Operations

Blueprint V4 covers operation planning, C2 infrastructure, implant/beacon concepts, phishing/social-engineering exercises, physical-security exercises, lateral movement, exfiltration, persistence, evasion and OPSEC. fileciteturn136file7L485-L496

## Implemented contract
- Operation planning requires explicit scope, exclusions and rules of engagement.
- Approval workflow is explicit: draft → pending approval → approved → simulation.
- Nine capability classes are modeled: C2, phishing, social engineering, physical, lateral movement, exfiltration, persistence, evasion and OPSEC.
- Results are synthetic simulation evidence with a chain-of-custody reference.

## Safety boundary
Shared runtime execution is simulation-only. Target-facing C2, payload delivery, credential harvesting, persistence/evasion, lateral movement and exfiltration are not enabled as unrestricted operations. Every simulated capability requires an approved operation, validated allowlist and explicit approval.

## API surface
- `GET/POST /api/v1/workspaces/:workspaceId/redteam/operations`
- `GET /api/v1/redteam/operations/:id`
- `POST /api/v1/redteam/operations/:id/request-approval`
- `POST /api/v1/redteam/operations/:id/approve`
- `POST /api/v1/redteam/operations/:id/status`
- `POST /api/v1/redteam/operations/:id/simulate`
- `GET /api/v1/redteam/c2/policy`
