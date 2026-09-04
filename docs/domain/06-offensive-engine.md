# Domain 06 — Offensive Engine / UTF

Blueprint-aligned scope: one governed Unified Tool Framework for recon, scan, exploit research, fuzzing, intelligence, OSINT, post-operation analysis and custom modules.

## Implemented contract
Every module has a manifest, risk class, capability, approval requirement and evidence adapter. Execution passes through validation → prepare → execute → collect → parse → normalize → cleanup.

## Safety boundary
High-risk capabilities are represented through governed adapters and controlled/simulated execution. The runtime fails closed when deployment authorization, target scope or required approval is absent.
