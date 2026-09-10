# Blueprint Literal Migration

This branch migrates the existing AngelMind implementation toward the repository layout described by `STRUKTURANGEL(1).pdf` without deleting executable behavior before its replacement is verified.

## Target layout

| Blueprint target | Current implementation during migration | Migration rule |
|---|---|---|
| `apps/frontend-angular` | `client/` | Move only after the frontend build entrypoint and route tests have an equivalent target build. |
| `apps/gateway-dotnet` | `server/_core`, `server/rest-v1.ts`, `server/routers.ts` | Requires a separately buildable gateway implementation; no source deletion before parity. |
| `apps/orchestrator-langgraph` | `server/governed-execution-service.ts`, worker, research workflow | Requires durable lifecycle and contract parity. |
| `src/c2/server` | `server/` | Compatibility source remains until the replacement passes all API and database gates. |
| `src/c2/modules` | `server/control-plane`, `server/engine`, `runtime/` | Migrate by bounded domain, not by blind file moves. |
| `contracts` | `contracts/`, `docs/`, route/schema declarations | Contract files are canonical; generated or duplicate declarations must be proven equivalent first. |
| `lab` | `lab/self-contained`, `docker-compose.yml`, integration fixtures | Expand by scenario and acceptance row. |
| `deploy` | `infrastructure/`, Railway files, Dockerfiles, workflows | Provider-specific files remain until replacement deployment is verified. |
| `tests` | `server/**/*.test.ts`, `client/**/*.test.ts`, `e2e/`, `apps/orchestrator-langgraph/tests` | Move tests only when tooling and coverage remain identical. |

## Safety rules

1. `blueprint-pre-migration-922f624` is the rollback tag for this migration.
2. Empty target directories are scaffolding only; they do not claim implementation parity.
3. No active source, migration, workflow, or deployment file may be deleted solely because its path differs from the PDF.
4. Every moved module needs an import/build/test proof before the old path is removed.
5. Provider and language changes are separate migration phases; a directory rename is not a Go/.NET/Angular rewrite.

## Current phase

Phase 1 creates the target layout and a machine-readable mapping. Phase 2 will move contract and test artifacts that have no runtime import boundary. Runtime services are migrated only after compatibility checks.
