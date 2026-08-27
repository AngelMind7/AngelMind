# Webhook Draft Boundary

The Operations Console permits an owner to record an **inactive** webhook draft containing an HTTPS public endpoint, a workspace-namespaced signing-secret reference, selected notification event types, and explicit endpoint confirmation. The server rejects non-HTTPS URLs, embedded credentials, local hostnames, common private IPv4 ranges, and `.local` or `.internal` hostnames.

Saving a draft never sends a request and always persists `enabled = false`. This prevents a browser form from turning into an unreviewed exfiltration path. Actual outbound delivery remains a future activation project requiring a dedicated secret, destination allowlisting, payload redaction, request signing, retry/dead-letter policy, delivery telemetry, and a separate approval step.
