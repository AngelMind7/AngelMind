# AngelMind V4 — API Endpoint Inventory

The PDF enumerates 28 API route groups and a 260+ endpoint target. The route-group counts below are copied from the blueprint; the Research group is explicitly `20+`, so the source does not provide a mathematically exact aggregate.

| Group | Blueprint count |
|---|---:|
| Auth | 13 |
| Identity | 12 |
| Organization | 10 |
| Workspace | 15 |
| Research | 20+ |
| Assets | 8 |
| Tools / UTF | 12 |
| AI | 13 |
| Evidence | 7 |
| Findings | 13 |
| Reports | 8 |
| Playbooks | 7 |
| Autonomous Workers | 6 |
| Knowledge | 6 |
| Governance | 9 |
| Audit | 4 |
| Incidents | 9 |
| Notifications | 5 |
| Privacy | 4 |
| Billing | 7 |
| Integrations | 8 |
| Search | 2 |
| Operations | 4 |
| Admin | 7 |
| Breakglass | 4 |
| Red Team | 13 |
| Purple Team | 6 |
| Bug Bounty | 8 |

## Canonical contract

`server/api-v1-contract.ts` is the machine-readable V4 REST contract. It records the named routes from the PDF, method, domain group, authorization class, and whether execution must remain governed or simulation-only. `scripts/check-api-v1-contract.mjs` validates duplicate-free route keys, all 28 blueprint groups, the required concrete V4 additions, and preservation of the PDF's `260+` target.

The contract is deliberately separate from implementation status: a route is not considered implemented merely because it appears in the blueprint. Concrete REST handlers must be backed by authenticated services, tenant/workspace authorization, validation, persistence where applicable, and the existing fail-closed execution policy.

## Executable API gate

The canonical tRPC router is also part of the API surface. `scripts/check-api-surface.mjs` counts executable tRPC leaves directly from `server/routers.ts` and fails CI unless at least 260 concrete procedures exist. This prevents the 260+ requirement from being satisfied by documentation-only entries.

## Concrete V4 additions already implemented

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/simulations/run` | Authenticated deterministic DAG simulation with synthetic evidence |
| GET | `/api/v1/tools/catalog` | Authenticated UTF catalog query |
| GET | `/api/v1/tools/runtime` | Runtime adapter inventory and health |
| POST | `/api/v1/workspaces/:workspaceId/tools/execute` | Governed tool execution path with scope/approval enforcement |
| GET | `/api/v1/executions/:jobId` | Execution progress lookup |
| GET | `/api/v1/meta/api-contract` | Authenticated machine-readable API contract discovery |

## Execution policy
All execution-oriented endpoints must enforce authentication, tenant/workspace scope, policy and approval where required, then emit an audit/evidence record. Red-team C2, phishing, persistence, lateral movement and exfiltration concepts are represented as governed simulations rather than unrestricted operational controls.
