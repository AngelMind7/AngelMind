<div align="center">

<img src="assets/readme/angelmind-banner.gif" alt="AngelMind colorful animated banner" width="100%" />

# AngelMind

### Find deeper. Prove clearly. Report responsibly.

**A governed control plane for authorized security research, evidence quality, and responsible vulnerability reporting.**

[![CI](https://github.com/AngelMind7/AngelMind/actions/workflows/ci.yml/badge.svg)](https://github.com/AngelMind7/AngelMind/actions/workflows/ci.yml)
[![Container](https://github.com/AngelMind7/AngelMind/actions/workflows/container.yml/badge.svg)](https://github.com/AngelMind7/AngelMind/actions/workflows/container.yml)

</div>

AngelMind membantu security researcher, bug bounty program owner, application security team, dan reviewer menjaga satu lifecycle research tetap **terstruktur, dapat ditelusuri, dan berbasis bukti**. Fokusnya bukan membuat aktivitas security menjadi lebih agresif, melainkan membuat scope, evidence, finding, review, remediation, dan retest menjadi lebih jelas serta dapat dipertanggungjawabkan.

> AngelMind is a control plane for authorized research—not an autonomous attack platform.

## Apa yang sudah tersedia

| Area | Status aktual |
|---|---|
| Scope dan policy | Allowlist, exclusions, safe harbor, rules of engagement, budget, cooldown, validation, dan perubahan policy. |
| Workspace dan authorization | Organization/workspace isolation, membership roles, server-side access checks, audit event, dan approval boundary. |
| Research workflow | Research session, asset inventory, observation, hypothesis, task lifecycle, dependency graph, readiness view, dan audit metadata. |
| Failure dan intelligence | Failure observations, evolution snapshots, intelligence feed records, playbook persistence, normalization, dan workspace-scoped API. |
| Evidence dan findings | Evidence upload dengan hash/reference, provenance events, finding lifecycle, duplicate/related/supersedes relations, review gate, retest records, dan report drafts. |
| AI control plane | Model registry/run records, request/trace headers, cost guard, structured evidence analysis, dual-gateway catalog, provider-aware fallback, dan transient-only retry policy. |
| Collaboration dan operations | Comments, mentions, notifications, incidents, governance approvals, health/readiness, audit archive, worker contracts, dan CI checks. |
| Public surface | Marketing, trust, security, documentation, pricing, legal pages, PWA shell, canonical metadata, Open Graph/Twitter metadata, `robots.txt`, dan `sitemap.xml`. |

## Workflow utama

```text
Authorized scope
      ↓
Asset and research session
      ↓
Observation → hypothesis → task
      ↓
Safe validation and evidence
      ↓
Failure / evolution / intelligence context
      ↓
Finding triage and human review
      ↓
Report draft and version
      ↓
Remediation and retest
      ↓
Responsible disclosure decision
```

Setiap tahap memiliki state, authorization boundary, validation, dan audit context sendiri. Data lintas workspace tidak boleh bercampur, dan AI tidak memperoleh jalur untuk menjalankan target-facing action secara otonom.

## Architecture

AngelMind saat ini adalah **modular monolith dengan dua runtime utama**:

| Path | Ownership |
|---|---|
| `client/` | React/Vite public marketing, authenticated dashboard, localization, dan PWA. |
| `server/` | Express/tRPC API, authentication, authorization, domain services, workers, AI orchestration, dan persistence adapters. |
| `drizzle/` | MySQL schema, forward migrations, relational integrity, dan migration metadata. |
| `research-service/` | Python safety-first contracts, planning, guardrails, dan network-free rehearsal. |
| `docs/` | Blueprint coverage, architecture, governance, deployment, and operational runbooks. |

Folder `ai-core/`, `api/`, dan `web/` adalah **dokumentasi boundary arsitektur masa depan**, bukan runtime package terpisah. Runtime source of truth tetap berada di `client/`, `server/`, `drizzle/`, dan `research-service/`.

## Quick start

### Prerequisites

- Node.js 22 atau kompatibel.
- pnpm 10 atau kompatibel.
- Python 3.12 untuk `research-service`.
- MySQL/TiDB jika ingin menjalankan persistence dan migration.

### Install

```bash
pnpm install --frozen-lockfile
python3 -m pip install -e 'research-service[dev]'
```

### Validate

```bash
pnpm check
pnpm test
pnpm lint:python
pnpm test:python
node scripts/check-provider-neutral.mjs
node scripts/check-migration-journal.mjs
pnpm build
pnpm check:budget
```

### Run locally

```bash
pnpm dev
```

Untuk environment yang memiliki database, migration dijalankan sesuai deployment runbook setelah backup dan preflight orphan-data check. Jangan menaruh credential atau secret ke repository.

## Security boundary

AngelMind hanya boleh digunakan untuk sistem, asset, dan aktivitas yang memiliki **authorization tertulis** dan mengikuti scope serta rules of engagement yang berlaku. Platform ini tidak boleh digunakan untuk unauthorized access, credential abuse, destructive testing, denial of service, persistence, evasion, harassment, data exfiltration, atau pengujian di luar scope.

AI dan research-service dibatasi untuk analisis evidence yang diberikan pengguna, planning, guardrail evaluation, dan rehearsal offline. Tidak ada autonomous target execution, credential replay, exploit submission, atau outbound reporting otomatis sebagai bagian dari default architecture.

Jika menemukan vulnerability pada AngelMind, jangan kirim credential, token, data pribadi, atau detail exploit melalui public issue. Gunakan security contact resmi dari deployment terkait dan ikuti disclosure policy yang berlaku.

## Project status

Matrix status yang authoritative adalah [`docs/blueprint-coverage.md`](docs/blueprint-coverage.md). Implementasi terbaru dan keputusan arsitektur dicatat di [`docs/blueprint-implementation-status.md`](docs/blueprint-implementation-status.md). Pekerjaan yang masih aktif dikelompokkan di [`docs/remaining-work.md`](docs/remaining-work.md), sedangkan checklist historis berada di [`docs/completed-work.md`](docs/completed-work.md).

AngelMind masih berada pada tahap **production hardening**. Fondasi control plane, workspace isolation, evidence, findings, reports, governance, failure/evolution/intelligence persistence, dan CI sudah tersedia. Hal yang membutuhkan environment atau keputusan operator—seperti production secrets, provider eksternal, payment, email, DNS, deployment promotion, dan restore drill—tidak diklaim selesai di README ini.

## Contributing

Sebelum membuka pull request, pastikan perubahan memiliki domain owner yang jelas, tidak melewati workspace authorization, tidak menambahkan target-facing capability tanpa design review, dan lulus validation suite. Perubahan schema wajib memiliki forward migration dan update migration journal. Perubahan public claim wajib selaras dengan coverage matrix.

Baca [`docs/repository-structure.md`](docs/repository-structure.md), [`docs/master-blueprint-alignment.md`](docs/master-blueprint-alignment.md), dan [`docs/production-runbook.md`](docs/production-runbook.md) sebelum mengubah arsitektur atau workflow keamanan.

<div align="center">

**Find deeper. Prove clearly. Report responsibly.**

</div>
