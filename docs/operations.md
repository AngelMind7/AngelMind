# Operations and Deployment Guide

## Local development

Run the dashboard with `pnpm dev`, verify TypeScript with `pnpm check`, and run the safety suite with `pnpm test`. The Python reference package is intentionally standalone: create a Python 3.12 environment, install the `dev` extra, and execute `pytest` from `research-service`.

## Scheduling

The dashboard contains a protected endpoint at `/api/scheduled/workspace-maintenance`. It authenticates the platform-issued task identity, resolves the workspace using the stored schedule task ID rather than request body data, then performs metadata-only eligibility checks. It skips orphaned, paused, archived, cooldown-bound, and over-budget workspaces. It never contacts a target.

Scheduling must be enabled only after the dashboard is deployed because scheduled callbacks invoke the deployed URL. The initial operational cadence should be conservative, for example `0 0 2 * * *` for 02:00 UTC daily. Validate that each workspace has an appropriate retention policy and budget before attaching a schedule.

## Production boundary

The hosted control plane is Node-based and suitable for the dashboard, database procedures, notifications, and bounded scheduled metadata checks. A future Python research worker that requires Python 3.12, custom system tools, or a long-running queue must be deployed separately on infrastructure that supports those requirements. It must consume only approved, workspace-scoped task records and must not bypass the control-plane guardrails.
