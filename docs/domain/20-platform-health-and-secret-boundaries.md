# Platform Health and Secret Boundaries

The platform now exposes a provider-neutral model health snapshot. A model is usable for new AI runs only when it is configured active and has a fresh health check. Missing, stale, degraded, and disabled models fail closed with an explicit reason; no live provider probe is fabricated.

Integration connections accept references, not raw credentials. Valid schemes are `env:`, `vault:`, `secret:`, and `lab:`. The self-contained lab can therefore exercise connection lifecycle and scope validation without storing provider secrets or contacting an external target.

The authenticated `ai.healthSnapshot` procedure exposes evaluated model health. Integration writes reject raw credential-looking values before persistence. These controls are repository-verifiable and remain safe when deployment secrets or provider accounts are absent.
