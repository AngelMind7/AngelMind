# Tool Contracts

No target-facing tool is implemented in this release. Any future integration must be added behind the following contract and only after the safety test suite remains green.

| Contract requirement | Enforcement point |
|---|---|
| Resolve workspace and owner before reading configuration | Workspace-scoped database helper |
| Evaluate allowlist and exclusion before task preparation | Deterministic scope guard |
| Require safe-harbor and code-of-conduct records | Policy engine |
| Stop at budget or session ceiling | Budget/session guard |
| Block Tier 3 until human approval exists | Governance gate |
| Store no credential value in run state or logs | Secret-reference model |
| Hash evidence metadata and store artifacts by workspace reference | Audit and evidence ledger |

The dry-run interface is not a tool adapter. It performs local planning only and persists `networkCalls: 0` and `toolExecutions: 0` in its event log.
