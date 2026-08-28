# Browser E2E Verification

The repository includes a Playwright smoke suite in `e2e/` and a `test:e2e` script. It verifies public route availability, safety-boundary copy, absence of offensive execution controls in the public API playground, unauthenticated dashboard protection, and mobile rendering.

## Local execution

Install browser binaries once, then run the suite:

```bash
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

The default configuration starts the local development server on `http://127.0.0.1:3000`. To test a deployed environment instead, set `E2E_BASE_URL`:

```bash
E2E_BASE_URL=https://your-production-domain.example pnpm test:e2e
```

The suite does not log in, create records, upload evidence, or submit reports. Authenticated checks must be run separately by an authorized reviewer in a controlled staging workspace.

## Manual authenticated matrix

| Area | Required verification |
| --- | --- |
| Auth | Login, logout, expired session, and unauthorized workspace access |
| Scope | Allowlist, exclusions, safe-harbor policy, and paused workspace behavior |
| Inventory | CSV and JSON import, rejected out-of-scope assets, and persisted records |
| Researcher | Evidence analysis, blocked unsafe instruction, and finding persistence |
| Findings | Lifecycle transitions, comments, reviewer approval, and audit event creation |
| Reports | Platform validation, secret detection, duplicate warning, version save, and export |
| Recovery | Archive creation, integrity verification, destination selection, and plan-only restore |
| Responsive | Desktop, tablet, mobile navigation, keyboard focus, reduced motion, and Arabic RTL |
| Operations | Notifications, governance approvals, incident handling, and schedule callback behavior |

Record the deployment URL, commit SHA, date, browser version, test workspace ID, and reviewer identity for each release verification. Do not use production customer evidence for routine browser tests.
