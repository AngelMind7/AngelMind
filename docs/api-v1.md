# AngelMind REST API v1

## Status and compatibility

The REST API is exposed under `/api/v1`. This document describes the routes currently implemented in `server/rest-v1.ts`. Breaking changes must use a new version such as `/api/v2`; existing v1 response envelopes must remain compatible.

All responses use JSON. Successful responses use `{ "data": ..., "apiVersion": "v1" }`, except the health endpoint, which returns `{ "ok": true, "apiVersion": "v1" }`. Errors use `{ "error": { "code": ..., "message": ... }, "apiVersion": "v1" }`.

## Authentication and authorization

`/api/v1/health` is public. Every other endpoint requires either the Firebase bearer authentication flow used by the web application or a server-created AngelMind API key:

```http
Authorization: Bearer <firebase-id-token>
```

API keys use the same header and are shown only once at creation or rotation:

```http
Authorization: Bearer am_<secret>
```

REST API keys must include `search:read` for search endpoints or `ai-runs:read` for AI-run endpoints. A wildcard scope (`*`) is accepted for controlled internal keys. Keys are hashed at rest, can be revoked or rotated, and cannot be used after expiry.

Workspace endpoints verify the authenticated user against the requested workspace. An inaccessible AI run returns `404 NOT_FOUND` rather than revealing whether a run exists in another workspace.

The server-side service-role credentials for Firebase, Supabase Storage, and any future provider must never be sent by clients or placed in browser variables.

## Endpoint reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Liveness/version contract. |
| `GET` | `/api/v1/workspaces/{workspaceId}/search` | Firebase bearer or `search:read` API key + workspace access | Search workspace-indexed records. |
| `GET` | `/api/v1/workspaces/{workspaceId}/ai-runs` | Firebase bearer or `ai-runs:read` API key + workspace access | List recent AI runs for a workspace. |
| `GET` | `/api/v1/ai-runs/{runId}` | Firebase bearer or `ai-runs:read` API key + workspace access | Read one AI run and its governed output. |

## `GET /api/v1/health`

Example:

```bash
curl -fsS https://YOUR_HOST/api/v1/health
```

Response:

```json
{
  "ok": true,
  "apiVersion": "v1"
}
```

## `GET /api/v1/workspaces/{workspaceId}/search`

Search is workspace-scoped. The `q` query parameter is the search text. The optional `limit` parameter is forwarded to the bounded search implementation and should be a positive integer; clients should keep it small enough for interactive use. `cursor` supports pagination, `entityTypes` accepts a comma-separated domain filter, and `freshnessDays` restricts results by update age.

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  "https://YOUR_HOST/api/v1/workspaces/42/search?q=authentication&limit=20"
```

Response shape:

```json
{
  "data": {
    "query": "authentication",
    "results": [
      {
        "id": 123,
        "entityType": "finding",
        "title": "...",
        "body": "...",
        "updatedAt": "2026-09-03T00:00:00.000Z"
      }
    ],
    "hasNextPage": false,
    "nextCursor": null,
    "facets": { "finding": 1 }
  },
  "apiVersion": "v1"
}
```

The exact result fields are owned by the workspace search service and may grow additively. Clients should ignore unknown fields.

## `GET /api/v1/workspaces/{workspaceId}/ai-runs`

Returns recent AI run metadata for a workspace. The endpoint is read-only and does not start provider execution.

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  "https://YOUR_HOST/api/v1/workspaces/42/ai-runs"
```

The response is a `data` array containing persisted run metadata, including status, model/gateway identifiers, cost metadata, retention deadline, and trace correlation fields when present. Sensitive output payloads are not returned by this listing endpoint.

## `GET /api/v1/ai-runs/{runId}`

Returns one persisted AI run and the output accessible under its workspace authorization boundary.

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  "https://YOUR_HOST/api/v1/ai-runs/123"
```

A successful response has this general shape:

```json
{
  "data": {
    "id": 123,
    "workspaceId": 42,
    "status": "completed",
    "traceId": "...",
    "output": null
  },
  "apiVersion": "v1"
}
```

An expired or purged output may be `null` while the run metadata and trace lineage remain available. Clients must not assume that a completed run always has a retained output payload.

## Error contract

| HTTP | Code | Meaning |
|---:|---|---|
| `400` | `BAD_REQUEST` | Invalid input or unavailable database contract surfaced as a client-safe error. |
| `401` | `UNAUTHENTICATED` | Missing or invalid Firebase bearer authentication. |
| `403` | `FORBIDDEN` | The authenticated user does not have access to the workspace. |
| `404` | `NOT_FOUND` | Resource does not exist or is intentionally hidden by workspace isolation. |
| `429` | `RATE_LIMITED` | The client exceeded the configured API window; honor `Retry-After`. |

Clients should log the `apiVersion`, HTTP status, and error code, but should not display raw internal error details to untrusted users.

## Operational verification

After deployment, run the public liveness check and an authenticated staging check with a non-production workspace:

```bash
curl --fail-with-body https://YOUR_HOST/api/v1/health
curl --fail-with-body -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  "https://YOUR_HOST/api/v1/workspaces/$WORKSPACE_ID/ai-runs"
```

Also verify that `/readyz` is healthy, `/metrics` is collected, and the worker uses the same database and server-side secrets as the web process. Do not use a production workspace or sensitive evidence for smoke tests.

## SDK and CLI

A dependency-light TypeScript client is available at [`api/rest-v1-client.ts`](../api/rest-v1-client.ts). It exposes typed `health()`, `search()`, `listAiRuns()`, and `getAiRun()` methods and throws `AngelMindApiError` with the HTTP status and stable error code for non-2xx responses. The client accepts an injected `fetch` implementation for testing.

For shell automation, configure `ANGELMIND_BASE_URL` and `ANGELMIND_API_KEY`, then use:

```bash
npm run api:cli -- health
npm run api:cli -- search 42 authentication 20
npm run api:cli -- ai-runs 42
```

The CLI is intentionally read-only and does not expose target-facing execution, report submission, credential handling, or migration operations.

## Generic idempotency

Mutation yang dapat diulang oleh client dapat memakai helper `executeIdempotent` dari `server/idempotency.ts`. Kontrak ini mengikat request pada kombinasi **user + scope + `Idempotency-Key`** dan menyimpan fingerprint SHA-256 serta response JSON di tabel `idempotencyRecords`.

Client mengirim header `Idempotency-Key` sepanjang 8–180 karakter. Pengulangan dengan key dan payload yang sama mengembalikan response tersimpan tanpa menjalankan handler lagi. Key yang sama dengan payload berbeda ditolak, request yang masih berjalan menghasilkan konflik, dan record memiliki TTL default 24 jam. Scope menjaga agar key dari operasi berbeda tidak saling bertabrakan.

Integrasi mutation dilakukan dengan membungkus side effect di dalam `executeIdempotent({ userId, scope, key, request, handler })`. Migrasi database yang diperlukan adalah `drizzle/0060_generic_idempotency.sql`.

## Current limitations

The v1 surface is intentionally read-only. It does not expose target-facing execution, autonomous submission, external delivery activation, migration controls, or purge mutation controls. Those operations remain behind governed tRPC procedures and server-side worker boundaries.
