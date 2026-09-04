# AngelMind V4 — API Endpoint Inventory

The PDF enumerates 28 API route groups and 260+ target endpoints. The route-group counts below are copied from the blueprint; some groups are marked 20+ in the source, so the exact aggregate is intentionally not reduced to a false precision.

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

## Execution policy
All execution-oriented endpoints must enforce authentication, tenant/workspace scope, policy and approval where required, then emit an audit/evidence record. Red-team C2, phishing, persistence, lateral movement and exfiltration concepts are represented as governed simulations rather than unrestricted operational controls.
