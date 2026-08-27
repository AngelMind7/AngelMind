# Workspace Team Access

Each workspace now has a membership ledger with four roles. The owner remains the configuration authority; operator and auditor records establish the scoped team model for future capability and evidence views; reviewer membership grants visibility into the Tier 3 approval queue for that workspace.

| Role | Current authority |
|---|---|
| Owner | Creates the workspace, manages membership, manages webhook drafts, and creates or verifies archives. |
| Reviewer | May view a delegated workspace’s Tier 3 approval queue and decide an approval only when they are not the original requestor. |
| Operator | May read workspace findings, dry-run history, audit events, and evidence references; no target-facing capability or workspace configuration mutation is available. |
| Auditor | May read workspace findings, dry-run history, audit events, and evidence references; no target-facing capability or workspace configuration mutation is available. |
| Global administrator | May review Tier 3 requests across workspaces, but cannot approve their own request. |

An invited user must have completed one authenticated sign-in first so their email resolves to an existing account. Membership changes create workspace audit events. The next access-control increment should apply the same role checks separately to every future task, report, and artifact mutation procedure.

## Exposed procedure matrix

| Procedure category | Required role |
|---|---|
| Workspace policy, status, credentials, team membership, webhook draft | Owner |
| Finding and evidence mutation | Owner |
| Findings, runs, audit events, and evidence-reference reads | Owner, operator, reviewer, or auditor |
| Tier 3, policy version, and webhook activation review | Distinct delegated reviewer or administrator |
| Incident create, acknowledge, and resolve | Owner or operator |

The `access-matrix` and `operations-access` test suites exercise these role decisions independently. Every API operation is also bound to a workspace ownership, membership, or distinct-reviewer check; no role receives a path to target-facing research activity.

## Route-by-route authorization inventory

| Routed procedures | Required boundary |
|---|---|
| `auth.*`, `control.dashboard` | Public session read or authenticated user dashboard only; no workspace write capability. |
| `notification.*` | Current authenticated user only. |
| `operations.members`, `operations.webhook`, `operations.archives` and their mutations | Workspace owner. |
| `assurance.policies`, `assurance.incidents`, `assurance.incidentEvidence`, `assurance.webhookActivationRequests` | Owner, operator, reviewer, or auditor with workspace membership. |
| `assurance.requestPolicy`, `assurance.requestWebhookActivation` | Workspace owner. |
| `assurance.decidePolicy`, `assurance.decideWebhookActivation`, `governance.decide` | Global administrator or delegated reviewer who is distinct from the requester. |
| `assurance.createIncident`, `assurance.acknowledgeIncident`, `assurance.resolveIncident`, `assurance.linkIncidentEvidence` | Workspace owner or operator. |
| `workspace.setStatus`, `workspace.credentials`, `workspace.addCredentialReference`, `workspace.scheduleAdministrativeCheck` | Workspace owner. |
| `rehearsal.run`, `finding.create`, `finding.transition`, `finding.approveReview`, `audit.uploadEvidence` | Workspace owner. |
| `rehearsal.listRuns`, `finding.list`, `audit.list`, `audit.evidence` | Owner, operator, reviewer, or auditor with workspace membership. |

The machine-readable `route-permissions` inventory and its test enumerate all routed procedures, including self-scoped notification endpoints and authenticated workspace creation. This makes authorization drift visible when a route is added or changed.

## Visual verification

The Operations Console was reviewed at desktop and 375×812 mobile breakpoints. Its workspace selector, alert entry point, neon page hierarchy, and guarded empty state are visible without horizontal overflow. Team, webhook-draft, and audit-archive controls become available only after an authenticated operator creates or selects a workspace; no sample workspace data was fabricated for review.
