# 🎯 AI Bug Bounty — Master Blueprint (Final Edition)
## Autonomous AI Security Researcher Platform
### Enterprise-Grade | Multi-Language | Cross-Device | Zero-Bug Target

---

# BAGIAN 1: VISI & FILOSOFI PRODUK

```
┌─────────────────────────────────────────────────────────────────┐
│  VISI:                                                          │
│  "Platform AI Bug Bounty otonom paling transparan, aman, dan    │
│   andal di dunia — yang bisa digunakan oleh security researcher │
│   dari level pemula sampai elite, di perangkat apapun,          │
│   dalam bahasa apapun."                                         │
├─────────────────────────────────────────────────────────────────┤
│  FILOSOFI TEKNIS:                                               │
│  1. Safety First    → Deterministic guardrails, tidak nego      │
│  2. Transparency    → Semua keputusan AI bisa di-trace         │
│  3. Accessibility   → HP ke server, bahasa apapun, jalan      │
│  4. Resilience      → Kalau ada yang fail, sistem tetap jalan │
│  5. Zero-Trust      → Bahkan admin tidak bisa bypass safety   │
└─────────────────────────────────────────────────────────────────┘
```

---

# BAGIAN 2: ARSITEKTUR SISTEM LENGKAP

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Mobile    │  │   Desktop   │  │    Tablet   │  │   CLI      │ │
│  │  (PWA/App)  │  │  (Browser)  │  │  (Browser)  │  │ (Terminal) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬─────┘ │
│         └─────────────────┴─────────────────┘                │      │
│                           │                                  │      │
│                    ┌──────┴──────┐                    ┌────┴────┐ │
│                    │  CDN / WAF  │                    │  SSH/API  │ │
│                    │  CloudFlare │                    │  Gateway  │ │
│                    └──────┬──────┘                    └────┬─────┘ │
│                           │                                │       │
└───────────────────────────┼────────────────────────────────┼───────┘
                            │                                │
┌───────────────────────────┼────────────────────────────────┼───────┐
│                     EDGE / GATEWAY LAYER                          │
│  ┌────────────────────────┴────────────────────────────────┐       │
│  │              NGINX / Caddy (Reverse Proxy)             │       │
│  │  • SSL termination  • Rate limiting  • WAF rules        │       │
│  └────────────────────────┬────────────────────────────────┘       │
│                           │                                        │
│  ┌────────────────────────┴────────────────────────────────┐       │
│  │              Kubernetes Ingress Controller               │       │
│  │  • Load balancing  • SSL passthrough  • Path routing    │       │
│  └────────────────────────┬────────────────────────────────┘       │
└───────────────────────────┼────────────────────────────────┼───────┘
                            │                                │
┌───────────────────────────┼────────────────────────────────┼───────┐
│                     APPLICATION LAYER                             │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  Marketing Site │  │   Web Dashboard │  │   API Gateway   │    │
│  │   (Next.js 14)  │  │  (React + Vite) │  │    (FastAPI)    │    │
│  │   SSR / SSG     │  │   SPA / PWA     │  │   REST + WS     │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              AI CORE ENGINE (Python 3.12+)                  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │  │
│  │  │Researcher│ │Discovery│ │ Testing │ │Validation│         │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │  │
│  │  │  Memory │ │  Safety │ │Scheduler│ │Governance│         │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────┐
│                     DATA & MESSAGING LAYER                        │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ PostgreSQL  │  │    Redis    │  │   Qdrant    │  │Kafka/Rab│ │
│  │  (Primary)  │  │  (Cache/WS) │  │ (Vector DB) │  │(Events) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │  MinIO/S3   │  │ClickHouse │  │  Prometheus │               │
│  │  (Objects)  │  │ (Analytics) │  │  (Metrics)  │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                          │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ Kubernetes  │  │   Docker    │  │   Terraform │  │ Ansible │ │
│  │   (Orchestr)│  │  (Container)│  │   (IaC)     │  │(Config) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │  Prometheus │  │   Grafana   │  │   Jaeger    │               │
│  │  + Alertman │  │  + Loki     │  │  (Tracing)  │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## 2.2 Konsep Utama

Ini bukan vulnerability scanner dan bukan sekumpulan:
- XSS Agent
- SQLi Agent
- IDOR Agent
- SSRF Agent

yang berjalan sendiri-sendiri.

Modelnya adalah:

```
                    BOUNTY PROGRAM
                         │
                  scope + rules + safe_harbor
                         │
                         ▼
                 ┌───────────────┐
                 │ SCOPE / POLICY│
                 │    GATE       │
                 │ (deterministic)│
                 └───────┬───────┘
                         │
                         ▼
                ┌──────────────────┐
                │  GOVERNANCE      │
                │  TIER CHECK      │
                │ (auto/notify/block)
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ AI SECURITY      │
                │ RESEARCHER       │
                └────────┬─────────┘
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Context     Memory     Asset Graph
             │           │           │
             └───────────┼───────────┘
                         ▼
                  Hypothesis Engine
                         │
                         ▼
                    Task Planner
                         │
                         ▼
              ┌────────────────────┐
              │  BUDGET / COST     │
              │  GUARDRAIL CHECK   │
              └──────────┬─────────┘
                         ▼
                   Policy Check
                         │
                         ▼
                    Tool Gateway
                         │
                         ▼
                   Observation
                         │
                         ▼
              ┌────────────────────┐
              │ DECEPTION DETECTOR │
              │ (honeypot/ canary) │
              └──────────┬─────────┘
                         ▼
                  ┌──────┴──────┐
                  │             │
             Interesting?    Nothing useful
                  │             │
                  ▼             ▼
              Validate       Learn/record
                  │             │
                  ▼             │
              Evidence         │
                  │             │
                  └──────┬──────┘
                         ▼
                   UPDATE MEMORY
                         │
                         ▼
                  NEXT RESEARCH TASK
                         │
                         └───────────────┐
                                         │
                         ┌───────────────┘
                         ▼
                  CONTINUOUS LOOP
```

**Kalau tidak ada task bernilai:**
```
NO HIGH VALUE TASK
        ↓
   CHECKPOINT
        ↓
   SESSION LIMIT? (max duration check)
        ↓
       WAIT
        ↓
   CHANGE DETECTED?
      ├── YES → RESEARCH
      └── NO  → WAIT AGAIN
```

---

# BAGIAN 3: STRUKTUR REPOSITORY LENGKAP

## 3.1 Root Structure

```
ai-bug-bounty/
│
├── 📁 .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   ├── cd-production.yml
│   │   ├── security-scan.yml
│   │   └── dependency-check.yml
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── 📁 infrastructure/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── vpc/
│   │   │   ├── eks/
│   │   │   ├── rds/
│   │   │   ├── elasticache/
│   │   │   ├── s3/
│   │   │   └── cloudflare/
│   │   ├── environments/
│   │   │   ├── development/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── main.tf
│   ├── kubernetes/
│   │   ├── base/
│   │   │   ├── namespace.yaml
│   │   │   ├── configmap.yaml
│   │   │   ├── secrets.yaml
│   │   │   ├── deployment-ai-core.yaml
│   │   │   ├── deployment-web.yaml
│   │   │   ├── deployment-api.yaml
│   │   │   ├── service.yaml
│   │   │   ├── ingress.yaml
│   │   │   ├── hpa.yaml
│   │   │   └── network-policy.yaml
│   │   └── overlays/
│   │       ├── development/
│   │       ├── staging/
│   │       └── production/
│   ├── ansible/
│   │   ├── playbooks/
│   │   │   ├── setup-base.yml
│   │   │   ├── hardening-linux.yml
│   │   │   └── install-tools.yml
│   │   └── roles/
│   │       ├── security/
│   │       ├── monitoring/
│   │       └── docker/
│   └── docker/
│       ├── Dockerfile.ai-core
│       ├── Dockerfile.web
│       ├── Dockerfile.api
│       ├── Dockerfile.worker
│       └── docker-compose.local.yml
│
├── 📁 web/
│   ├── marketing/
│   └── app/
│
├── 📁 api/
│   ├── app/
│   │   ├── core/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── users.py
│   │   │   │   │   ├── programs.py
│   │   │   │   │   ├── findings.py
│   │   │   │   │   ├── agents.py
│   │   │   │   │   ├── tasks.py
│   │   │   │   │   ├── evidence.py
│   │   │   │   │   ├── budget.py
│   │   │   │   │   ├── coverage.py
│   │   │   │   │   ├── memory.py
│   │   │   │   │   ├── approvals.py
│   │   │   │   │   ├── reports.py
│   │   │   │   │   ├── notifications.py
│   │   │   │   │   ├── chat.py
│   │   │   │   │   ├── benchmarks.py
│   │   │   │   │   ├── marketplace.py
│   │   │   │   │   ├── settings.py
│   │   │   │   │   └── health.py
│   │   │   │   └── websocket/
│   │   │   └── v2/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── db/
│   │   └── tasks/
│   ├── tests/
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile
│
├── 📁 ai-core/
│   ├── src/
│   │   ├── core/
│   │   │   ├── researcher.py
│   │   │   ├── agent_orchestrator.py
│   │   │   ├── pipeline.py
│   │   │   ├── state_machine.py
│   │   │   ├── scope_guard.py
│   │   │   ├── policy_engine.py
│   │   │   ├── tool_gateway.py
│   │   │   ├── memory_brain.py
│   │   │   ├── event_bus.py
│   │   │   ├── run_manager.py
│   │   │   ├── checkpoint_manager.py
│   │   │   ├── kill_switch.py
│   │   │   └── health_manager.py
│   │   ├── agents/
│   │   │   ├── base_agent.py
│   │   │   ├── agent_registry.py
│   │   │   ├── researcher/
│   │   │   │   ├── program_agent.py
│   │   │   │   ├── attack_surface_agent.py
│   │   │   │   ├── hypothesis_agent.py
│   │   │   │   ├── prioritization_agent.py
│   │   │   │   ├── correlation_agent.py
│   │   │   │   └── chain_reasoning_agent.py
│   │   │   ├── discovery/
│   │   │   │   ├── asset_agent.py
│   │   │   │   ├── subdomain_agent.py
│   │   │   │   ├── dns_agent.py
│   │   │   │   ├── endpoint_agent.py
│   │   │   │   ├── parameter_agent.py
│   │   │   │   ├── api_agent.py
│   │   │   │   └── technology_agent.py
│   │   │   ├── testing/
│   │   │   │   ├── web_testing.py
│   │   │   │   ├── api_testing.py
│   │   │   │   ├── authentication.py
│   │   │   │   ├── authorization.py
│   │   │   │   ├── session_testing.py
│   │   │   │   ├── business_logic.py
│   │   │   │   ├── input_validation.py
│   │   │   │   ├── client_side.py
│   │   │   │   ├── file_upload.py
│   │   │   │   ├── configuration.py
│   │   │   │   └── cryptography.py
│   │   │   ├── validation/
│   │   │   │   ├── validator_agent.py
│   │   │   │   ├── reproduction_agent.py
│   │   │   │   ├── evidence_agent.py
│   │   │   │   ├── impact_agent.py
│   │   │   │   ├── dedup_agent.py
│   │   │   │   └── severity_agent.py
│   │   │   └── reporting/
│   │   │       ├── reporter_agent.py
│   │   │       ├── report_formatter.py
│   │   │       └── notification_agent.py
│   │   ├── tools/
│   │   │   ├── mcp_server.py
│   │   │   ├── nmap_wrapper.py
│   │   │   ├── nuclei_wrapper.py
│   │   │   ├── sqlmap_wrapper.py
│   │   │   ├── katana_wrapper.py
│   │   │   ├── gospider_wrapper.py
│   │   │   ├── playwright_wrapper.py
│   │   │   ├── http_client.py
│   │   │   ├── dns_wrapper.py
│   │   │   └── screenshot_wrapper.py
│   │   ├── traffic/
│   │   │   ├── request_store.py
│   │   │   ├── response_store.py
│   │   │   ├── har_parser.py
│   │   │   ├── traffic_fingerprint.py
│   │   │   └── replay_manager.py
│   │   ├── asset_graph/
│   │   │   ├── graph.py
│   │   │   ├── nodes.py
│   │   │   ├── relationships.py
│   │   │   └── queries.py
│   │   ├── context_engine/
│   │   │   ├── context_manager.py
│   │   │   ├── program_context.py
│   │   │   ├── target_context.py
│   │   │   ├── auth_context.py
│   │   │   ├── technology_context.py
│   │   │   ├── finding_context.py
│   │   │   └── context_builder.py
│   │   ├── task_planner/
│   │   │   ├── planner.py
│   │   │   ├── task_generator.py
│   │   │   ├── task_prioritizer.py
│   │   │   ├── dependency_resolver.py
│   │   │   └── task_deduplicator.py
│   │   ├── identity/
│   │   │   ├── identity_manager.py
│   │   │   ├── session_manager.py
│   │   │   ├── account_profiles.py
│   │   │   └── persona_engine.py
│   │   ├── scheduler/
│   │   │   ├── scheduler.py
│   │   │   ├── job_queue.py
│   │   │   ├── retry_manager.py
│   │   │   ├── wake_manager.py
│   │   │   └── session_limiter.py
│   │   ├── memory/
│   │   │   ├── short_term.py
│   │   │   ├── long_term.py
│   │   │   ├── semantic_memory.py
│   │   │   ├── episodic_memory.py
│   │   │   └── memory_retriever.py
│   │   ├── learning/
│   │   │   ├── feedback.py
│   │   │   ├── pattern_store.py
│   │   │   ├── finding_memory.py
│   │   │   └── evaluation.py
│   │   ├── knowledge/
│   │   │   ├── knowledge_loader.py
│   │   │   ├── writeup_search.py
│   │   │   ├── methodology_search.py
│   │   │   └── embedding_service.py
│   │   ├── program_intelligence/
│   │   │   ├── program_parser.py
│   │   │   ├── rule_extractor.py
│   │   │   ├── asset_parser.py
│   │   │   ├── exclusion_parser.py
│   │   │   ├── reward_parser.py
│   │   │   └── program_profile.py
│   │   ├── change_detection/
│   │   │   ├── asset_diff.py
│   │   │   ├── endpoint_diff.py
│   │   │   ├── behavior_diff.py
│   │   │   ├── technology_diff.py
│   │   │   └── change_detector.py
│   │   ├── coverage/
│   │   │   ├── coverage_tracker.py
│   │   │   ├── attack_surface_coverage.py
│   │   │   ├── methodology_coverage.py
│   │   │   ├── endpoint_coverage.py
│   │   │   └── coverage_report.py
│   │   ├── experiments/
│   │   │   ├── experiment_manager.py
│   │   │   ├── experiment_store.py
│   │   │   ├── observation.py
│   │   │   └── conclusion.py
│   │   ├── governance/
│   │   │   ├── approval_gate.py
│   │   │   ├── tier_classifier.py
│   │   │   └── escalation_manager.py
│   │   ├── safety/
│   │   │   ├── safety_controller.py
│   │   │   ├── scope_guard.py
│   │   │   ├── policy_engine.py
│   │   │   ├── rate_controller.py
│   │   │   ├── action_validator.py
│   │   │   ├── emergency_stop.py
│   │   │   ├── audit_guard.py
│   │   │   ├── deception_detector.py
│   │   │   ├── budget_guard.py
│   │   │   └── rollback_manager.py
│   │   ├── sandbox/
│   │   │   ├── tool_sandbox.py
│   │   │   ├── process_manager.py
│   │   │   ├── filesystem_policy.py
│   │   │   └── network_policy.py
│   │   ├── llm/
│   │   │   ├── llm_gateway.py
│   │   │   ├── model_router.py
│   │   │   ├── prompt_manager.py
│   │   │   ├── response_parser.py
│   │   │   ├── tool_call_parser.py
│   │   │   ├── token_budget.py
│   │   │   └── model_fallback.py
│   │   ├── confidence/
│   │   │   ├── confidence_engine.py
│   │   │   ├── evidence_score.py
│   │   │   ├── reproducibility_score.py
│   │   │   ├── impact_score.py
│   │   │   └── confidence_calibration.py
│   │   ├── adapters/
│   │   │   ├── hackerone.py
│   │   │   ├── bugcrowd.py
│   │   │   ├── intigriti.py
│   │   │   ├── custom_program.py
│   │   │   └── inbound_parser.py
│   │   ├── notifications/
│   │   │   ├── telegram.py
│   │   │   ├── discord.py
│   │   │   ├── email.py
│   │   │   └── dispatcher.py
│   │   ├── observability/
│   │   │   ├── traces.py
│   │   │   ├── metrics.py
│   │   │   ├── telemetry.py
│   │   │   └── dashboard.py
│   │   ├── credentials/
│   │   │   ├── credential_manager.py
│   │   │   └── secret_provider.py
│   │   ├── cases/
│   │   │   ├── case_manager.py
│   │   │   ├── case_store.py
│   │   │   ├── case_status.py
│   │   │   └── case_archive.py
│   │   ├── evaluation/
│   │   │   ├── evaluator.py
│   │   │   ├── benchmark_runner.py
│   │   │   ├── regression_runner.py
│   │   │   ├── agent_evaluator.py
│   │   │   ├── tool_evaluator.py
│   │   │   ├── finding_evaluator.py
│   │   │   ├── coverage_evaluator.py
│   │   │   ├── efficiency_evaluator.py
│   │   │   ├── safety_evaluator.py
│   │   │   ├── hallucination_evaluator.py
│   │   │   ├── calibration.py
│   │   │   └── evaluation_report.py
│   │   ├── simulation/
│   │   │   ├── simulator.py
│   │   │   ├── mock_target.py
│   │   │   ├── scenario_runner.py
│   │   │   ├── traffic_replayer.py
│   │   │   ├── result_checker.py
│   │   │   └── rehearsal.py
│   │   ├── red_team/
│   │   │   ├── agent_stress.py
│   │   │   ├── prompt_confusion.py
│   │   │   ├── scope_escape_tests.py
│   │   │   ├── tool_abuse_tests.py
│   │   │   ├── memory_poisoning_tests.py
│   │   │   └── loop_failure_tests.py
│   │   ├── legal/
│   │   │   ├── evidence_chain.py
│   │   │   ├── safe_harbor.py
│   │   │   ├── retention_policy.py
│   │   │   └── code_of_conduct.py
│   │   ├── schemas/
│   │   │   ├── scope.py
│   │   │   ├── program.py
│   │   │   ├── asset.py
│   │   │   ├── endpoint.py
│   │   │   ├── hypothesis.py
│   │   │   ├── observation.py
│   │   │   ├── test_task.py
│   │   │   ├── finding.py
│   │   │   ├── evidence.py
│   │   │   ├── run.py
│   │   │   └── report.py
│   │   └── utils/
│   │       ├── logger.py
│   │       ├── cost_tracker.py
│   │       ├── rate_limiter.py
│   │       ├── hashing.py
│   │       ├── timestamps.py
│   │       └── serialization.py
│   ├── tests/
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── Dockerfile
│
├── 📁 shared/
│   ├── types/
│   ├── constants/
│   └── schemas/
│
├── 📁 docs/
│   ├── architecture/
│   ├── api/
│   ├── deployment/
│   ├── security/
│   ├── i18n/
│   └── operations/
│
├── 📁 scripts/
│   ├── setup.sh
│   ├── dev-start.sh
│   ├── test.sh
│   ├── lint.sh
│   ├── deploy.sh
│   └── backup.sh
│
├── .env.example
├── .env
├── .gitignore
├── .dockerignore
├── Makefile
├── docker-compose.yml
├── docker-compose.prod.yml
├── README.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
└── CHANGELOG.md
```

---

# BAGIAN 4: STRUKTUR WEBSITE LENGKAP

## 4.1 Arsitektur 2-Lapis

```
┌──────────────────────────────────────────────────────────────┐
│                     LAPISAN 1: MARKETING                       │
│              ai-bug-bounty.com (Publik)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Home   │ │ Features│ │  Demo   │ │  Docs   │           │
│  │ Pricing │ │  Blog   │ │ Changelog│ │ Contact │           │
│  │ Trust   │ │ Academy │ │ API Play │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     LAPISAN 2: APLIKASI                        │
│              app.ai-bug-bounty.com (Auth)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Dashboard│ │ Mission │ │ Program │ │Settings │           │
│  │ Findings│ │ Evidence│ │ Coverage│ │ Analytics│          │
│  │ Memory  │ │ Chat    │ │         │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└──────────────────────────────────────────────────────────────┘
```

## 4.2 Marketing Site Pages

### Home (`/`)
- Hero Section (Terminal Replay + CTA)
- Social Proof Strip (real metrics)
- Feature Grid (6 cards)
- How It Works (timeline)
- Live Metrics Ticker
- Testimonial / Case Study
- Pricing Teaser
- FAQ Accordion
- Final CTA
- Footer (Language Switcher 20 bahasa)

### Features (`/features`)
- Page Header
- Deep-Dive Feature 1-6 (dengan screenshot real + terminal output)
- Comparison Table (AI vs Scanner vs Manual)
- CTA Section

### Interactive Demo (`/demo`)
- Demo Launcher (3 mock target options)
- Live Stream Panel (WebSocket terminal)
- Results Explorer
- Explanation Sidebar

### Documentation (`/docs`)
- Getting Started
- Architecture
- API Reference (auto-generated)
- Security Whitepaper
- i18n Guide
- Changelog (`/changelog`)

### Blog (`/blog`)
- Blog Index (grid + filter + search)
- Blog Post Template

### Pricing (`/pricing`)
- Pricing Cards (Free / Pro / Enterprise)
- Feature Comparison Table
- FAQ Pricing
- Enterprise Contact Form

### Trust Center (`/trust`)
- Security Overview
- Compliance Certificates
- Penetration Test Results
- Data Processing Agreement
- Subprocessors List
- Incident Response Policy

### Academy (`/academy`)
- Course Directory
- Video Player
- Progress Tracker
- Certificate Viewer

### API Playground (`/api-playground`)
- Endpoint Explorer
- Request Builder
- Response Viewer
- Code Generator

### Legal
- Privacy Policy (`/privacy`)
- Terms of Service (`/terms`)
- Cookie Policy (`/cookies`)
- Security Disclosure (`/security`)

## 4.3 Web App Dashboard Pages

### Layout Global (AppShell)
- Top Navigation Bar
- Sidebar Navigation (Desktop)
- Bottom Navigation (Mobile, 5 tab)
- Command Palette (Cmd+K)
- Notification Center (Slide-over)
- Floating Chat Widget (sudut kanan bawah)

### Dashboard Home (`/dashboard`)
- AI Status Card
- Active Programs Count
- Pending Approvals Count
- Budget Usage Meter
- Live Activity Feed
- Coverage Mini Chart
- Recent Findings List
- Program Overview Cards
- Floating Action Button (Mobile)

### Mission Control (`/mission`)
- Agent Monitor (Tree View)
- Live Terminal
- Activity Map (Mini Asset Graph)
- Control Panel (Pause/Resume/Emergency Stop)

### Program Detail (`/programs/:id`)
- Tab: Overview
- Tab: Attack Surface (Full Asset Graph)
- Tab: Hypotheses (Board View)
- Tab: Findings (Kanban Board)
- Tab: Traffic (HAR Viewer)
- Tab: Brain / Memory
- Tab: Budget

### Finding Detail (`/findings/:id`)
- Header (ID + Severity + Confidence + Status)
- AI Explanation Block
- Impact Assessment
- CVSS Calculator
- Reproduction Steps
- Evidence Panel (Requests/Responses/Screenshots/PoC)
- Chain of Custody Timeline
- Action Buttons (Validate/Reject/Edit/Export/Submit)
- Comments & Collaboration Thread

### Evidence Viewer (`/evidence/:id`)
- File Tree (Left)
- Content Viewer (Right)
- HTTP / Image / HAR / PoC viewers

### Approval Queue (`/approvals`)
- Filter Bar (Pending/Approved/Rejected)
- Approval Cards
- Detail Slide-over
- Auto-reject Countdown

### Coverage Dashboard (`/coverage`)
- OWASP WSTG Heatmap Grid
- Endpoint Coverage Table
- Methodology Coverage Chart

### Memory Inspector (`/memory`)
- Semantic Search Bar
- Results Cards
- Hypothesis Board (Sub-tab)
- Decision Log (Sub-tab)

### Analytics (`/analytics`)
- Research Velocity Chart
- Cost Efficiency Chart
- Skill Radar Chart
- Comparison Chart
- Seasonality Heatmap

### Settings (`/settings`)
- Account (Profile, MFA, API Keys, Sessions)
- Programs (Platforms, Scope Editor)
- AI Config (Model, Budget, Safety, Tiers)
- Tools (Enable/Disable, Rate Limits)
- Notifications (Channels, Events, Quiet Hours)
- Billing (Usage, Invoices, Payment)
- Team (Members, Roles, Audit Log)
- Appearance (Theme, Language, Density)
- Security (Login History, Devices)

---

# BAGIAN 5: MULTI-BAHASA (i18n) — STRATEGI GLOBAL

## 5.1 Bahasa yang Didukung (20 Bahasa)

| Kode | Bahasa | Prioritas | RTL |
|------|--------|-----------|-----|
| `en` | English | P0 | ❌ |
| `id` | Bahasa Indonesia | P0 | ❌ |
| `ja` | 日本語 | P1 | ❌ |
| `ko` | 한국어 | P1 | ❌ |
| `zh` | 中文 | P1 | ❌ |
| `de` | Deutsch | P1 | ❌ |
| `fr` | Français | P1 | ❌ |
| `es` | Español | P1 | ❌ |
| `pt` | Português | P1 | ❌ |
| `ru` | Русский | P1 | ❌ |
| `ar` | العربية | P2 | ✅ |
| `hi` | हिन्दी | P2 | ❌ |
| `vi` | Tiếng Việt | P2 | ❌ |
| `th` | ภาษาไทย | P2 | ❌ |
| `tr` | Türkçe | P2 | ❌ |
| `pl` | Polski | P2 | ❌ |
| `nl` | Nederlands | P2 | ❌ |
| `it` | Italiano | P2 | ❌ |
| `sv` | Svenska | P2 | ❌ |
| `tl` | Tagalog | P3 | ❌ |

## 5.2 Scope Translasi

**Marketing Site:**
- Semua UI text
- Blog posts (opsional per bahasa)
- Dokumentasi (prioritas: EN, ID)
- Legal pages (prioritas: EN)

**App Dashboard:**
- Semua UI text
- Error messages
- Notification templates
- Email templates
- Report templates (AI-generated per bahasa)
- Date/number/currency formatting per locale

**AI Core:**
- Prompt templates per bahasa
- Report generation per bahasa
- Finding explanation localization

## 5.3 RTL Support
- Arabic (ar) — Right-to-Left
- Layout mirroring: sidebar kanan, text align right
- Icon direction reversal (arrow, chevron)
- Number/English text tetap LTR dalam konteks RTL

---

# BAGIAN 6: RESPONSIVE & CROSS-DEVICE

## 6.1 Breakpoint System

| Breakpoint | Width | Target Device |
|------------|-------|---------------|
| xs | < 480px | Small phones |
| sm | 480-640px | Large phones |
| md | 640-768px | Tablets portrait |
| lg | 768-1024px | Tablets landscape |
| xl | 1024-1280px | Laptops |
| 2xl | 1280-1536px | Desktops |
| 3xl | > 1536px | Large monitors |

## 6.2 Per-Device Experience

**Mobile (< 768px):**
- Single column layout
- Bottom navigation (5 tab)
- Cards stack vertically
- Tables convert to cards
- Modals become bottom sheets
- Sidebar becomes hamburger menu
- Floating Action Button
- Swipe gestures
- Pull-to-refresh
- Biometric auth support
- Touch targets minimum 44x44px

**Tablet (768-1024px):**
- 2 column grid
- Collapsible sidebar (icon-only mode)
- Split view untuk detail pages
- Touch + mouse hybrid support

**Desktop (> 1024px):**
- Multi-column layouts (up to 4)
- Persistent sidebar
- Resizable panels
- Drag-and-drop enabled
- Keyboard shortcuts active
- Command palette (Cmd+K)
- Multi-select (Shift/Ctrl)

## 6.3 PWA (Progressive Web App)

- Manifest: name, short_name, icons (72-512px), theme, display standalone
- Service Worker: cache static, network-first for API, offline fallback
- Push Notifications: Finding, Approval, Budget Alert, Safety
- Splash screens (all sizes)
- Apple touch icons
- Status bar theme color
- Safe area insets (notch support)
- Home screen icon

---

# BAGIAN 7: KOMPONEN DESIGN SYSTEM

## 7.1 Foundation Layer
- Colors: Semantic tokens (primary, secondary, success, warning, danger, info, neutral)
- Typography: Heading sizes, body sizes, mono sizes, line heights, weights
- Spacing: Scale system (4px base)
- Shadows: Elevation levels (0-5)
- Border Radius: Component-specific tokens
- Animations: Duration, easing functions (custom cubic-bezier: expo out)

## 7.2 Layout Components
AppShell, Sidebar (collapsible), TopBar, MobileNav, CommandPalette, Breadcrumb, PageHeader, GridSystem, SplitPane, BottomSheet, Modal, SlideOver, Tooltip, Popover, Toast

## 7.3 Data Display Components
Card, DataTable, KanbanBoard, TreeView, Timeline, Accordion, Tabs, Badge, ProgressBar, ChartWrapper, EmptyState, Skeleton, ErrorBoundary

## 7.4 Input Components
Button, TextInput, TextArea, Select, Checkbox, Radio, Toggle, DatePicker, SearchBar, FilterBar, FileUpload, ColorPicker, Slider

## 7.5 Feedback Components
Toast, Alert, ConfirmationModal, LoadingSpinner, ProgressIndicator, StatusDot, ConfidenceMeter, SeverityBadge

## 7.6 Domain-Specific Components
Terminal, AssetGraph, EvidenceViewer, HarViewer, MarkdownEditor, CodeBlock, ImageViewer, OWASPGrid, ApprovalCard, FindingCard, AIStatusCard, BudgetMeter, ActivityFeed, LiveTerminal, ChatInterface, LanguageSwitcher, ThemeToggle

## 7.7 Responsive Components
MobileCard, DesktopTable, TouchFriendlyButton, SwipeableList, PullToRefresh, FloatingActionButton, BottomSheet, CollapsibleSection

## 7.8 Motion Components
FadeIn, SlideUp, StaggerContainer, ShimmerSkeleton, PulseRing, TypingIndicator, CountUp

---

# BAGIAN 8: FITUR PREMIUM & "MAHAL"

## 8.1 Motion System
- Custom easing curve: `cubic-bezier(0.16, 1, 0.3, 1)`
- Shared element transitions
- Layout animations
- Skeleton shimmer dengan gradient angle 110°
- Button press: scale 0.97 + shadow reduce
- Smooth scroll dengan momentum + parallax subtle
- Custom cursor untuk desktop (dot expand on hover)
- Focus rings dengan glow effect

## 8.2 Sound Design

| Event | Sound Type | Haptic (Mobile) |
|-------|-----------|-----------------|
| Finding discovered | Subtle "ding" | Heavy impact |
| Approval required | Alert chime | Double tap |
| Action approved | Satisfying "whoosh" | Light impact |
| Error / Blocked | Low thud | Error vibration |
| AI completes task | Soft ascending chime | Success pattern |
| Emergency stop | Immediate silence + low tone | Triple buzz |

## 8.3 Gamification & Achievement System

- *"First Blood"* — Finding pertama
- *"Night Owl"* — AI berjalan 8 jam nonstop
- *"Scope Master"* — 100% coverage satu kategori
- *"Valid Hunter"* — 10 finding tervalidasi
- *"Penny Pincher"* — Temukan critical dengan cost <$5
- *"Safety First"* — 50 Tier 3 actions approved safely
- *"Polyglot"* — Gunakan 5 bahasa berbeda

Komponen: AchievementToast, BadgeCollection, StreakFlame, LeaderboardTable, XPProgressBar, DailyChallengeCard, RankBadge

## 8.4 Cinematic Onboarding
1. **Wake Up** — Screen hitam, terminal cursor blink, AI "Hello, I'm ready"
2. **Scope Scan** — Visualisasi domain "di-scan" dengan radar effect
3. **Safety Briefing** — Tier 1/2/3 dijelaskan dengan ilustrasi interaktif
4. **First Run** — AI jalan 30 detik, user cuma nonton
5. **Celebration** — First finding (mock) muncul, confetti, achievement unlock

## 8.5 Print & Export Experience
- Cover page dengan logo user
- Table of Contents otomatis
- Page numbers, headers, footers
- Evidence dalam layout magazine-style
- Watermark "Confidential" option
- Digital signature block
- PDF/A compliance

## 8.6 Integration Ecosystem
- Webhooks: Slack, Discord, Telegram, Jira, GitHub, GitLab, Notion, Linear, Trello, Zapier, Make
- Webhook Events: finding.validated, finding.reported, approval.required, budget.threshold, coverage.completed, agent.error, scope.violation

## 8.7 Trust Center & Compliance
- SOC2 Type II, ISO 27001, GDPR badges
- Penetration Test Results (public audit summary)
- Data Residency Map
- Encryption Diagram
- Subprocessors Table
- Incident Response Policy
- Bug Bounty Program (meta)

## 8.8 Advanced Analytics (User-facing)
- Research Velocity Chart
- Cost Efficiency Chart
- Skill Radar Chart (OWASP categories)
- Comparison Chart (You vs Top 10%)
- Seasonality Heatmap
- ROI Calculator

## 8.9 Theme System Deep
- Midnight (default — deep navy, cyan)
- Obsidian (pure black OLED-friendly)
- Solarized (classic dev)
- Cyberpunk (neon pink/purple)
- Paper (elegant light)
- High Contrast (accessibility)
- Custom (user-defined primary color)

## 8.10 Collaboration & Comments
- Comment Thread per Finding
- Mention System (@user)
- Reaction Picker (emoji)
- Thread Resolver
- Assignment Badge
- Due Date Chip
- Activity Log

## 8.11 Unique Visual Features
- ProgramDNA — Helix visualisasi attack surface
- VulnerabilityGenome — Mapping CVE ke target
- ThreatLandscape — 2D/3D landscape map
- SecurityPulse — Live "heartbeat" security posture

## 8.12 Interactive API Playground
- Endpoint Explorer (tree view)
- Request Builder (form)
- Response Viewer (syntax highlighted JSON)
- Code Generator (curl, Python, JS)
- Auth Configurator
- Environment Switcher

---

# BAGIAN 9: KEAMANAN & SAFETY

## 9.1 Governance Tiering

| Tier | Action | AI Behavior |
|------|--------|-------------|
| **Tier 1** | Read-only recon, passive discovery | Auto-execute |
| **Tier 2** | Active testing non-destructive (fuzzing, auth bypass) | Auto-execute + real-time notify |
| **Tier 3** | Destructive/privileged (account takeover PoC, data exfil, privesc) | **BLOCK → Pause → Escalate to human → Wait approval** |

## 9.2 Safety Layer (Deterministic)
```
LLM proposes action
       ↓
scope check
       ↓
policy check
       ↓
rate check
       ↓
budget check
       ↓
action allowed?
```
Kalau tidak: **BLOCK**

## 9.3 Deception Detection
- Honeypot endpoint detection
- Canary token awareness
- Behavioral anomaly detection ("too easy/too perfect")

## 9.4 Budget Guardrails
- Daily/weekly token budget (LLM calls)
- Daily/weekly compute budget (tool execution)
- Hard stop: pause non-essential tasks kalau over threshold
- Cost-per-finding efficiency metric

## 9.5 Rollback & Undo
- Undo log untuk actions potentially destructive
- Traffic replay reversal
- Impact mitigation protocol
- Database snapshot sebelum Tier 3 actions

## 9.6 Legal & Compliance
- **Safe Harbor:** Verify sebelum testing aktif
- **Evidence Chain:** Hash + timestamp + immutable log
- **Retention Policy:** Auto-purge PII (GDPR compliant)
- **Code of Conduct:** Enforce program-specific rules

## 9.7 Frontend Security
- OAuth2 + PKCE
- JWT access token (15 menit) + Refresh token (httpOnly cookie, 7 hari)
- MFA: TOTP + Backup codes + WebAuthn/FIDO2
- Session timeout: 30 menit idle
- Concurrent session limit: 3 per user
- Strict CSP headers
- No inline scripts
- Subresource Integrity (SRI)
- HTTPS only (HSTS)
- CSRF tokens
- Rate limiting

---

# BAGIAN 10: LIFECYCLE & WORKFLOW

## 10.1 Finding Lifecycle
```
DISCOVERED
    ↓
TRIAGED
    ↓
CANDIDATE
    ↓
REPRODUCING
    ↓
VALIDATED
    ↓
REPORTED
    ↓
SUBMITTED
```

Cabangnya:
```
CANDIDATE
 ├── INVALID
 ├── DUPLICATE
 └── INCONCLUSIVE
```

## 10.2 Research Loop Final
```
LOAD CONTEXT
    ↓
VERIFY SAFE HARBOR
    ↓
VERIFY SCOPE
    ↓
GOVERNANCE TIER SETUP
    ↓
DISCOVERY
    ↓
ATTACK-SURFACE MODEL
    ↓
HYPOTHESIS
    ↓
TEST
    ↓
OBSERVE
    ↓
DECEPTION CHECK
    ↓
MEMORY UPDATE
    ↓
NEXT TASK
    ↓
...
```

## 10.3 Safety Verification Flow
```
LLM proposes action
       ↓
scope check (deterministic)
       ↓
policy check (deterministic)
       ↓
rate check (deterministic)
       ↓
budget check (deterministic)
       ↓
governance tier classification
       ↓
   ├─ Tier 1/2 → EXECUTE
   └─ Tier 3 → ESCALATE HUMAN
```

---

# BAGIAN 11: INFRASTRUKTUR & DEPLOYMENT

## 11.1 Technology Stack

**Backend:**
- Python 3.12+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic 2.5, asyncio, Celery + Redis, Qdrant, ClickHouse, MinIO/S3, Kafka/RabbitMQ

**Frontend:**
- Next.js 14 (Marketing), React 18 (Dashboard), Vite, TypeScript 5.3, Tailwind CSS 3.4, shadcn/ui, Zustand, TanStack Query, React Router 6, React Hook Form, Zod, Recharts, Cytoscape.js, i18next, date-fns, Lucide React

**AI Core:**
- LiteLLM, OpenAI/Anthropic/Google/Local, Playwright, httpx, dnspython, cryptography, gVisor/Firecracker

**Infrastructure:**
- Docker, Kubernetes (EKS/GKE), Terraform, Ansible, NGINX/Traefik, CloudFlare, Let's Encrypt, Prometheus + Grafana + Loki + Jaeger, Sentry

## 11.2 Development Phases

**Phase 0: Foundation (Minggu 1-2)**
- Repository setup, CI/CD, Docker Compose, database schema, skeleton all services

**Phase 1: Core Engine (Minggu 3-6)**
- AI Core: scope_guard, policy_engine, agents, safety, memory, task_planner
- Safety: 100% deterministic, 1000 property tests
- Benchmark: 3 mock targets, min 3 vulnerabilities found

**Phase 2: API & Backend (Minggu 7-10)**
- REST API lengkap, WebSocket, Auth & MFA, rate limiting, audit logging
- API docs (OpenAPI/Swagger), 100% endpoint test coverage

**Phase 3: Web Dashboard (Minggu 11-14)**
- Dashboard functional, real-time updates, cross-device responsive
- PWA, offline mode, 20 languages, RTL, dark/light themes
- E2E testing (Cypress/Playwright), Accessibility (WCAG 2.1 AA)
- Lighthouse: Performance 90+, Accessibility 95+

**Phase 4: Marketing Site (Minggu 15-16)**
- Marketing site live, interactive demo, SEO optimized
- Core Web Vitals < 2.5s LCP, hreflang tags

**Phase 5: Integration & Polish (Minggu 17-18)**
- End-to-end integration, load testing (100 concurrent users)
- Security audit (penetration test), performance optimization
- Backup strategy, disaster recovery, documentation

**Phase 6: Launch & Iterate (Minggu 19+)**
- Soft launch (invite-only beta), feedback collection
- Public launch, content marketing, community building

---

# BAGIAN 12: TESTING STRATEGY (ZERO-BUG TARGET)

## 12.1 Testing Pyramid
```
                    ┌─────────┐
                    │   E2E   │  ← 10% (Critical paths)
                    │ Cypress │
                    └────┬────┘
                   ┌─────┴─────┐
                   │ Integration│  ← 30%
                   │  pytest    │
                   └─────┬─────┘
                ┌────────┴────────┐
                │     Unit        │  ← 60%
                │  pytest + jest  │
                └─────────────────┘
```

## 12.2 Test Categories
- Unit Tests (Backend + Frontend)
- Integration Tests (API + DB + Cache)
- E2E Tests (Critical user journeys)
- Property-Based Tests (Hypothesis untuk safety layer)
- Visual Regression Tests (Playwright)
- Security Tests (OWASP Top 10 API checks)
- Performance Tests (Lighthouse, load testing)
- Accessibility Tests (axe-core, WCAG 2.1 AA)

## 12.3 Critical Test: Safety Property
```
Property: Scope guard NEVER allows request to excluded domain.
Test: 1000 random combinations of action + url + scope
Assertion: result.allowed is ALWAYS False untuk excluded domains
```

---

# BAGIAN 13: CHECKLIST "KELIHATAN MAHAL" (LAUNCH READY)

| # | Aspek | Status |
|---|-------|--------|
| 1 | Tidak ada loading spinner generik — semua pakai skeleton custom | ☐ |
| 2 | Tidak ada "Lorem Ipsum" atau placeholder text | ☐ |
| 3 | Tidak ada error message teknis mentah ke user | ☐ |
| 4 | Setiap tombol punya hover state | ☐ |
| 5 | Setiap page transition punya animasi | ☐ |
| 6 | Mobile: semua touch target ≥ 44px | ☐ |
| 7 | Mobile: swipe gestures pada semua list/card | ☐ |
| 8 | Desktop: keyboard shortcuts untuk semua action utama | ☐ |
| 9 | Empty states punya ilustrasi custom + CTA | ☐ |
| 10 | Sound design untuk 5+ event penting | ☐ |
| 11 | Haptic feedback pada mobile | ☐ |
| 12 | Dark/Light/System + 3+ custom themes | ☐ |
| 13 | Print/PDF export rapi seperti dokumen profesional | ☐ |
| 14 | Onboarding cinematic (bukan form bertingkat) | ☐ |
| 15 | Gamification: minimal 10 achievement | ☐ |
| 16 | Trust Center dengan compliance badges | ☐ |
| 17 | Interactive API Playground | ☐ |
| 18 | Real-time presence (who's online) | ☐ |
| 19 | Comments & mentions pada findings | ☐ |
| 20 | Webhook integrations (Slack, Discord, Jira) | ☐ |
| 21 | Public status page | ☐ |
| 22 | Public roadmap | ☐ |
| 23 | Changelog seperti Linear (visual, dated) | ☐ |
| 24 | 20 bahasa dengan RTL support | ☐ |
| 25 | PWA installable dengan splash screen | ☐ |
| 26 | Command palette (Cmd+K) | ☐ |
| 27 | Lighthouse score ≥ 90 semua kategori | ☐ |
| 28 | Accessibility: WCAG 2.1 AA | ☐ |
| 29 | Custom 404/500 pages dengan ilustrasi | ☐ |
| 30 | Favicon + OG images untuk semua pages | ☐ |
| 31 | Liquid fill gauge untuk budget (bukan progress bar kering) | ☐ |
| 32 | Pulsing aura ring untuk status online | ☐ |
| 33 | AI Brain Visualization untuk loading states | ☐ |
| 34 | ProgramDNA / VulnerabilityGenome visualizer | ☐ |
| 35 | Cinematic error pages (robot "patah") | ☐ |

---

# BAGIAN 14: NAVIGASI & INFORMATION ARCHITECTURE

## 14.1 Marketing Site Navigation
**Main Nav:**
- Product (dropdown: Features, Demo, Pricing)
- Documentation
- Blog
- Changelog
- Login / Get Started

**Footer Nav:**
- Product: Features, Demo, Pricing, Security
- Resources: Docs, Blog, API Reference, Community, Academy
- Company: About, Careers, Contact
- Legal: Privacy, Terms, Security, Cookies

## 14.2 App Navigation (Sidebar)
**Primary Items (max 7):**
1. Dashboard
2. Mission Control
3. Programs
4. Findings
5. Approvals (with badge)
6. Coverage
7. Memory / Brain

**Secondary (More dropdown):**
- AI Chat (floating widget primary)
- Analytics
- Settings
- Help / Docs

**Bottom Items:**
- Settings
- Help
- Logout

## 14.3 Mobile Bottom Nav (5 Tab)
1. Home (Dashboard)
2. Programs
3. Findings
4. Chat
5. Settings

---

# BAGIAN 15: KESIMPULAN

Blueprint ini bukan sekadar "AI menjalankan scanner".

Ini adalah:
> **"AI security researcher yang mempunyai context, memory, attack graph, hypothesis generation, task planning, testing capabilities, validation, evidence, learning, continuous scheduling, change detection, coverage, governance tiering, budget guardrails, legal compliance, deception awareness, rollback capability, persona mimicry, dan safety verification — dengan scope/policy/safety sebagai kontrol deterministik yang diverifikasi secara formal — dibungkus dalam experience web yang premium, multi-bahasa, cross-device, dan transparan."**

**Tahap berikutnya:**
1. Definisikan kontrak inti antar modul
2. Implementasi safety layer pertama (diverifikasi sebelum agent code)
3. Setup infrastructure dan CI/CD
4. Development Phase 0-1

---

*Dokumen ini adalah master reference. Semua keputusan teknis, arsitektural, dan produk harus merujuk ke dokumen ini.*
