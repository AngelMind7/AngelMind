# AngelMind V4 — System Architecture

The blueprint defines a five-platform model: Cloudflare at the edge, Supabase as primary PostgreSQL/Auth/Realtime, Railway for API/Python/tool runtime/Redis, and Firebase as optional operations/notification services, with GitHub as source control and CI.

The primary flow is: authenticated client → edge controls → API → policy/scope checks → queue/runtime → evidence normalization → findings/reporting. Cross-domain entities are linked through the unified knowledge graph.

Production secrets and provider identifiers are deployment configuration, never repository content.
