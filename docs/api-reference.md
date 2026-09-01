# AngelMind API and Operator Reference

Dokumen ini merangkum surface tRPC yang tersedia pada control plane dan aturan operasional yang harus dipenuhi sebelum fitur digunakan pada environment live. Semua procedure yang menerima `workspaceId` atau `sessionId` melakukan pemeriksaan authorization server-side; client tidak boleh dianggap sebagai boundary keamanan.

## Research lifecycle

| Procedure | Operasi | Guard utama |
|---|---|---|
| `research.sessions` | List session dalam workspace | Workspace read access |
| `research.createSession` | Membuat session | Workspace responder access |
| `research.transitionSession` | Mengubah state session | Valid transition dan workspace responder access |
| `research.assets` / `research.createAsset` | List/create asset | Session ownership, workspace scope, dan target scope validation |
| `research.observations` / `research.createObservation` | List/create observation | Session scope dan optional in-scope asset |
| `research.promoteObservationToFinding` | Membuat finding dari observation | Session/workspace match, deterministic fingerprint, audit, dan status `linked` |
| `research.hypotheses` / `research.createHypothesis` | List/create hypothesis | Session scope dan referensi observation yang sama session |
| `research.transitionHypothesis` | Mengubah state hypothesis | Explicit state machine dan responder access |
| `research.tasks` / `research.createTask` | List/create task | Session scope, positive dependency IDs, dan dependency same-session |
| `research.transitionTask` | Run/pause/retry/cancel task | Explicit state machine dan completed dependency gate |

## Knowledge graph and search

| Procedure | Operasi | Boundary |
|---|---|---|
| `knowledge.graph` | Membaca graph workspace | Workspace read access, active node filtering, temporal normalization |
| `knowledge.upsertNode` | Membuat atau memperbarui node | Workspace responder access dan normalized properties |
| `knowledge.createEdge` | Menghubungkan node | Kedua node wajib berada pada workspace yang sama |
| `knowledge.traverse` | Menemukan path antarnode | Workspace scope, cycle-safe traversal, bounded depth |
| `search.global` | Mencari lintas entity | Workspace read access, bounded result count, token-aware relevance, freshness, dan dedup index |

## Intelligence and playbooks

| Procedure | Operasi | Boundary |
|---|---|---|
| `research.intelligenceFeed` | Membaca feed | Workspace read access dan bounded result set |
| `research.ingestIntelligenceFeed` | Ingest batch feed | Maksimal 100 item/request, validation, deterministic SHA-256 dedupe, idempotent upsert, audit |
| `research.playbooks` | Membaca playbook | Workspace read access |
| `research.runPlaybook` | Mengubah playbook menjadi research tasks | Active version, session/workspace match, dependency graph, audit, tanpa target-facing autonomous action |

## Worker and outbox

Worker job lease memiliki claim, heartbeat periodik selama handler berjalan, stale recovery, retry backoff, dan dead-letter transition. Outbox dispatcher bersifat configurable: handler hanya dijalankan jika `outboxHandlers` didaftarkan secara eksplisit. Consumer receipts mencegah event yang sama diproses berulang oleh consumer yang sama. Provider outbound tidak aktif secara default.

Migration wajib diterapkan berurutan. Migration research workspace consistency terbaru adalah `drizzle/0032_research_workspace_consistency.sql`; migration intelligence dedupe adalah `drizzle/0031_intelligence_feed_dedupe.sql`. Sebelum menerapkan migration pada database live, operator wajib mengambil backup, menjalankan preflight, dan melakukan smoke test rollback/restore sesuai `docs/production-runbook.md`.

## Release verification

Validasi repository lokal dijalankan dengan perintah berikut:

```bash
pnpm check
pnpm test
pnpm build
pnpm check:budget
pnpm test:e2e
```

`pnpm test:e2e` dan deployment smoke test memerlukan browser/environment yang tersedia. Credential, provider key, Firebase production domain, Supabase bucket policy, database URL, dan Railway configuration harus berasal dari secret manager atau dashboard environment; jangan menaruh nilai rahasia di source code, frontend bundle, atau migration.

## Safety boundary

AngelMind tetap disabled-by-default untuk target-facing scanning, exploitation, credential replay, exfiltration, dan autonomous external submission. Workflow tersebut tidak boleh diaktifkan melalui konfigurasi biasa; perubahan harus melalui design, security, legal, dan owner review terpisah.
