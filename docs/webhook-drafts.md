# Webhook Draft Boundary

The Operations Console permits an owner to record an **inactive** webhook draft containing an HTTPS public endpoint, a workspace-namespaced signing-secret reference, selected notification event types, and explicit endpoint confirmation. The server rejects non-HTTPS URLs, embedded credentials, local hostnames, common private IPv4 ranges, and `.local` or `.internal` hostnames.

Saving a draft never sends a request and always persists `enabled = false`. A workspace owner may then create an activation request only if the public HTTPS destination has been confirmed and a workspace-namespaced signing-secret reference is present. A distinct administrator or delegated reviewer can approve or reject that readiness request; approval remains a recorded governance decision and still leaves `enabled = false` because no outbound transport has been implemented.

This prevents a browser form from becoming an unreviewed exfiltration path. Actual outbound delivery is a future activation project requiring a dedicated provisioned secret, destination allowlisting, payload redaction, request signing, retry/dead-letter policy, delivery telemetry, and a separate production release.
