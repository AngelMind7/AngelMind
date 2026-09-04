# UTF Module Contract

AngelMind V4 UTF (Unified Tool Framework) exposes the blueprint module catalog through a canonical, machine-readable manifest.

## Contract

- Manifest: `config/tool-capability-registry.json`
- Schema version: 2
- Module target: 50+
- Each module declares identity, version, category, tier, risk, approval, scope, execution, input, output/evidence transformation, health check, adapter and artifact provenance.
- High-risk and target-facing modules are fail-closed and simulation-only until an explicitly authorized, verified production integration exists.
- Offline/artifact and passive-review modules remain constrained by scope validation and runtime disposition.
- Custom modules use sandbox execution contracts; repository policy forbids treating untrusted input as executable code.

## Verification

`node scripts/check-utf-module-contract.mjs` validates module count, uniqueness, required manifest fields, scope validation, evidence transformation, approval requirements, simulation constraints and catalog parity.

The same check is exposed as `pnpm check:utf-contract` and runs in `.github/workflows/utf-module-contract.yml` together with TypeScript validation.

## Blueprint coverage

The catalog covers the ten UTF categories from the V4 document: RECON, SCAN, EXPLOIT, FUZZ, C2, PHISH, INTEL, OSINT, POST and CUSTOM. Operationally dangerous capabilities are represented by governed simulation adapters rather than unrestricted target-facing execution.
