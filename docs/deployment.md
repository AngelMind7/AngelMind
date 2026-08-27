# Deployment Boundary

The current project is a Node-based hosted control plane. Its deployment responsibilities are the authenticated dashboard, database-backed governance and evidence ledgers, notification calls, managed artifact storage, and bounded scheduled metadata checks. Publish the project before attempting to attach a workspace schedule, because scheduled callbacks invoke the deployed endpoint rather than the local development server.

The included Python 3.12+ package is a source and test foundation, not a process launched by the web deployment. If a future authorized research worker requires Python execution, custom system binaries, Docker isolation, or a long-running queue, it must be deployed as a separate worker on compatible infrastructure. The worker must obtain only policy-approved, workspace-scoped work from the control plane and must treat a missing, blocked, or expired approval as a hard stop.

No target-facing integration is shipped or activated by this dashboard. Before one is added, preserve the property-based scope, Tier 3, and rehearsal isolation tests; establish capability-specific rate controls and audit coverage; and obtain program-specific authorization.
