# Infrastructure Boundary

Managed hosting is the default deployment profile. This directory is reserved for reviewed deployment descriptors, observability configuration, backup evidence, and environment-specific infrastructure only when a demonstrated workload requires them.

Kubernetes, Terraform, Ansible, queues, and dedicated workers are intentionally not created as placeholder runtime dependencies. Any future descriptor must include least privilege, secret separation, egress controls, rollback evidence, retention policy, and an owner.
