# Infrastructure Boundary

AngelMind V4 uses a five-platform repository contract:

1. **GitHub** — source control and Actions verification.
2. **Cloudflare** — edge/frontend, Workers, storage/cache descriptors, and reviewed edge controls.
3. **Supabase** — primary PostgreSQL/Auth/Realtime configuration boundary.
4. **Railway** — API/compute/runtime deployment boundary.
5. **Firebase** — optional backup authentication, operational cache, and push/Functions boundary.

The repository contract verifies that each platform has a concrete descriptor or workflow and that the critical security/deployment markers are present. It does **not** claim that provider accounts, production credentials, paid plans, DNS, or live services have been provisioned.

Managed hosting is the default deployment profile. This directory is reserved for reviewed deployment descriptors, observability configuration, backup evidence, and environment-specific infrastructure only when a demonstrated workload requires them.

Kubernetes, Terraform, Ansible, queues, and dedicated workers are intentionally not created as placeholder runtime dependencies. Any future descriptor must include least privilege, secret separation, egress controls, rollback evidence, retention policy, and an owner.
