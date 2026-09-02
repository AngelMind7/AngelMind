# API Boundary and REST clients

API ownership remains inside the current Express/tRPC application under `server/`. The versioned REST gateway is exposed under `/api/v1`; this directory contains the dependency-light TypeScript client at [`rest-v1-client.ts`](./rest-v1-client.ts).

The SDK supports health checks, workspace search, AI-run listing, and AI-run detail retrieval. It uses the same `{ data, apiVersion }` response envelope as the gateway and raises `AngelMindApiError` with HTTP status and stable error code for non-2xx responses. A custom `fetch` implementation can be injected for contract tests.

```ts
import { AngelMindRestV1Client } from "./rest-v1-client";

const client = new AngelMindRestV1Client({
  baseUrl: "https://angelmind.example.com",
  apiKey: process.env.ANGELMIND_API_KEY,
});

const results = await client.search(42, {
  query: "authentication",
  limit: 20,
  entityTypes: ["finding", "evidence"],
});
```

For shell automation, set `ANGELMIND_BASE_URL` and `ANGELMIND_API_KEY`, then run `npm run api:cli -- health`, `npm run api:cli -- search 42 authentication 20`, or `npm run api:cli -- ai-runs 42`.

All future API extraction must preserve authenticated workspace scope, role checks, deterministic policy checks, versioned contracts, redaction, and audit events before feature logic executes. The REST v1 surface is intentionally read-only: target-facing endpoints, credential replay, autonomous submission, outbound delivery, and migration controls are not exposed. API keys are hashed at rest, scope-checked, optionally workspace-bound, and must never be placed in browser variables or committed to the repository.
