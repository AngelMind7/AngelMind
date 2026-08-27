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

## Visual verification

The Operations Console was reviewed at desktop and 375×812 mobile breakpoints. Its workspace selector, alert entry point, neon page hierarchy, and guarded empty state are visible without horizontal overflow. Team, webhook-draft, and audit-archive controls become available only after an authenticated operator creates or selects a workspace; no sample workspace data was fabricated for review.
