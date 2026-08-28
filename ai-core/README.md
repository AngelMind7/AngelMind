# AI Core Boundary

The current AI-core foundation is implemented in `research-service/` as a Python, network-free reference package. It contains typed contracts, deterministic guardrails, and offline rehearsal only.

Future modules may add planning, memory, evaluation, and coverage accounting for synthetic or user-provided evidence. They must not add active discovery, probing, fuzzing, exploitation, credential testing, or autonomous reporting without a separate authorized design review.
