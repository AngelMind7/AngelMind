# AngelMind REST API v1

## Status and compatibility

The REST API is exposed under `/api/v1`. This document describes the routes currently implemented in `server/rest-v1.ts`. Breaking changes must use a new version such as `/api/v2`; existing v1 response envelopes must remain compatible.

All responses use JSON. Successful responses use `{ "data": ..., "apiVersion": "v1" }`, except the health endpoint, which returns `{ "ok": true, "apiVersion": "v1" }`. Errors use `{ "error": { "code": ..., "message": ... }, "apiVersion": "v1" }`.

## Authentication and authorization

`/api/v1/health` is public. Every other endpoint requires the Firebase bearer authentication flow used by the web application:

```http
Authorization: Bearer <firebase-id-token>
```

Workspace endpoints verify the authenticated user against the requested workspace. An inaccessible AI run returns `404 NOT_FOUND` rather than revealing whether a run exists in another workspace.

The server-side service-role credentials for Firebase, Supabase Storage, and any future provider must never be sent by clients or placed in browser variables.

## Endpoint reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Liveness/version contract. |
| `GET` | `/api/v1/workspaces/{workspaceId}/search` | Firebase bearer + workspace access | Search workspace-indexed records. |
| `GET` | `/api/v1/workspaces/{workspaceId}/ai-runs` | Firebase bearer + workspace access | List recent AI runs for a workspace. |
| `GET` | `/api/v1/ai-runs/{runId}` | Firebase bearer + workspace access | Read one AI run and its governed output. |

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

Search is workspace-scoped. The `q` query parameter is the search text. The optional `limit` parameter is forwarded to the bounded search implementation and should be a positive integer; clients should keep it small enough for interactive use.

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  "https://YOUR_HOST/api/v1/workspaces/42/search?q=authentication&limit=20"
```

Response shape:

```json
{
  "data": [
    {
      "id": 123,
      "title": "...",
      "snippet": "..."
    }
  ],
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

Clients should log the `apiVersion`, HTTP status, and error code, but should not display raw internal error details to untrusted users.

## Operational verification

After deployment, run the public liveness check and an authenticated staging check with a non-production workspace:

```bash
curl --fail-with-body https://YOUR_HOST/api/v1/health
curl --fail-with-body -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  "https://YOUR_HOST/api/v1/workspaces/$WORKSPACE_ID/ai-runs"
```

Also verify that `/readyz` is healthy, `/metrics` is collected, and the worker uses the same database and server-side secrets as the web process. Do not use a production workspace or sensitive evidence for smoke tests.

## Current limitations

The v1 surface is intentionally read-only. It does not expose target-facing execution, autonomous submission, external delivery activation, migration controls, or purge mutation controls. Those operations remain behind governed tRPC procedures and server-side worker boundaries.
