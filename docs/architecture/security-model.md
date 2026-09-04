# AngelMind V4 — Security Model

Security controls are layered across identity, tenant isolation, scoped API keys, rate limits, policy evaluation, approval workflow, execution resource gates, immutable audit evidence and recovery procedures.

The tool framework uses explicit manifests and risk classes. High-risk capabilities require explicit authorization and approval. The repository never stores production credentials.

Testing must cover authentication bypass, tenant isolation and scope enforcement before go-live.
