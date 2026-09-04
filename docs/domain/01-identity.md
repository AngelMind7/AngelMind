# Domain 01 — Identity & Access

Blueprint-aligned scope: authentication, RBAC/ABAC, scoped API keys, MFA, breakglass, device trust, and federation.

## Implemented contract
- Session-bound authentication and workspace isolation.
- Scoped API keys with explicit permissions and rotation/revocation.
- MFA/WebAuthn integration points with audit coverage.
- Breakglass is approval-gated, time-limited, and fully audited.
- Device trust and identity-provider integrations remain fail-closed until configured.

## Safety boundary
Credentials are never exposed through logs or evidence. Security-testing automation cannot bypass identity or authorization gates.
