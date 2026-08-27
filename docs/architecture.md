# AngelMind Architecture

AngelMind is a **control plane for authorized security research**, not an autonomous scanner. The deployed application is an authenticated dashboard and policy service that owns workspace configuration, governance decisions, audit records, rehearsal output, and reporting workflow. It does not embed active research tooling or target-facing clients.

> The safety layer is deterministic and is evaluated before any future research capability is considered. A dry-run has a hard contract of zero network calls and zero tool executions.

| Plane | Responsibility | Current implementation |
|---|---|---|
| Control plane | Workspace ownership, safe harbor, scope, budget, governance, audit, reporting workflow | React, Express, tRPC, Drizzle/MySQL |
| Safety plane | Scope/exclusion matching, tier classification, budget/session checks, offline rehearsal isolation | TypeScript guardrails and Python reference package |
| Future research plane | Approved, separately hosted capabilities with isolated credentials | Explicitly out of scope for this release |

The domain flow is `Scope → Asset → Observation → Hypothesis → Task → Evidence → Finding → Run`. Every object carries a `workspace_id` or equivalent database `workspaceId`, and all queries resolve a workspace through the authenticated owner. Credential values are never stored in the dashboard database; only a workspace-scoped secret reference may be recorded.

## Governance model

| Tier | Examples in this system | Policy result |
|---|---|---|
| Tier 1 | Scope parsing, policy review, coverage planning, rehearsal | May proceed only inside a valid workspace policy |
| Tier 2 | Future non-destructive capability proposal | Reserved for a future integration; owner notification is required |
| Tier 3 | Privileged proof or any destructive proposal | Blocked and recorded; a human approval is required before later orchestration can be considered |

An approval represents a human decision in the control plane. It does not directly execute a target-facing action. This separation protects against an approval becoming an accidental execution primitive.
