# Integration and Sync Domain

The integration domain stores workspace-scoped connection metadata and supports a self-contained sync preview. A preview consumes a synthetic JSON fixture, validates provider scopes, classifies accepted and rejected events, and emits a deterministic evidence hash.

The preview is not a provider connector. It does not exchange credentials, send a webhook, fetch external records, or claim that a provider account is connected. A connection marked `connected` means the workspace lifecycle record is enabled for preview processing; external activation remains a separately configured operational state.

## Contract

| Requirement | Implementation |
|---|---|
| Workspace boundary | `assertIntegrationAccess` before listing, mutation, or preview. |
| Scope boundary | Provider-specific allowlist in `integration-contract.ts`. |
| Input boundary | JSON array, maximum 100 events, bounded identifiers and titles. |
| Evidence | SHA-256 hash over provider, status, scopes, accepted events, and rejected events. |
| External traffic | Always `false` in preview result. |
| Dispatch | Always `preview_only`; no outbound call exists. |
| Draft/disabled connection | Events are rejected with lifecycle reason and never accepted for dispatch. |
| Provider activation | Remains environment-dependent and is never represented as a fake successful connection. |

The tRPC procedure `integrations.previewSync` is authenticated and workspace-scoped. It exists so lifecycle, authorization, evidence, and UI behavior can be tested completely inside the repository-owned lab.
