# Domain 02 — Organization & Workspace

Blueprint-aligned scope: tenant roots, plans, entitlements, workspaces, members, invitations, billing and quotas.

## Implemented contract
- Organization is the tenant boundary.
- Workspace membership is checked before workspace-scoped reads and writes.
- Roles and entitlements are explicit policy inputs.
- Usage and quota records support cost governance.
- Billing-provider integrations are configuration-gated.

## Isolation rule
A workspace-bound request cannot read or mutate another workspace by changing a URL identifier.
