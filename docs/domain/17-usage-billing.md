# Usage, Quota, and Invoice Preview Domain

The usage domain provides a repository-owned accounting contract without activating a payment provider. It accepts bounded workspace-scoped usage events, validates the billing period, rejects duplicate event identifiers, aggregates deterministic line items, compares the subtotal with a quota, and produces a SHA-256 evidence hash.

The output is explicitly an **invoice preview**, not a charge, invoice submission, payment authorization, refund, or financial record. Payment is represented as `disabled_external_provider` until a separately authorized provider configuration exists.

## Contract

| Requirement | Implementation |
|---|---|
| Tenant boundary | Authenticated workspace access check before preview. |
| Event identity | Duplicate event IDs are rejected. |
| Period integrity | Events must fall within the half-open `[start, end)` period. |
| Amount integrity | Quantity and unit prices are bounded non-negative integers. |
| Quota | `withinQuota` is calculated deterministically from subtotal and quota. |
| Evidence | Hash binds workspace, period, quota, and ordered input events. |
| External payment | Disabled; no provider call or charge path exists. |
| Reproducibility | Same input yields the same line items and evidence hash. |

The tRPC procedure `usage.invoicePreview` is read-only and consumes synthetic usage event JSON. It exists to complete lifecycle, authorization, quota, reporting, and evidence behavior inside the self-contained lab.
