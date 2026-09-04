# AngelMind V4.0 — System Architecture

The blueprint defines a unified offensive-security platform with 14 domains, a shared knowledge graph, governed UTF execution, and five infrastructure platforms. This repository maps those concerns into explicit planes.

## Planes
- **Web/application:** public and authenticated pages, workspace context, command palette and global search.
- **API/control:** application procedures plus the REST v1 compatibility surface.
- **Governance:** tenant isolation, authorization, scope, policy, approval, audit and retention.
- **Execution:** UTF catalog, governed runner, execution ledger, progress events and evidence normalization.
- **Data:** PostgreSQL/Drizzle as the durable relational model; object storage for evidence and reports.
- **Edge/operations:** Cloudflare edge services and Railway API/workers/runtime; Firebase remains optional for notification/ops workflows.

## Unified Knowledge Graph
Core identifiers connect Asset → Operation → Finding → Evidence → Report. Tool, AI, intelligence and workflow records can reference the same entities so provenance remains traceable.

## Execution boundary
Target-facing execution must resolve authorization, scope, policy and approval before dispatch. High-risk blueprint families are simulation adapters by default. A catalog manifest alone never grants execution authority.

## Provider boundary
Supabase provides primary PostgreSQL/Auth/Realtime when configured. Railway provides API/workers/tool runtime/Redis. Cloudflare provides edge/static/cache/storage primitives. Firebase is optional for FCM/ops. Provider credentials and live resource IDs remain deployment configuration and are never committed as secrets.
