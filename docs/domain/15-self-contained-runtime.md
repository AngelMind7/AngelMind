# Self-Contained Runtime Domain

The runtime domain exposes the canonical adapter names required by the UTF catalog, but the default lab image does not download or execute vendor tools. Each adapter name resolves to a repository-owned controlled validator.

A controlled validator accepts version/help probes and fixture metadata, emits deterministic local output, and never sends traffic to a target. It is therefore suitable for contract, lifecycle, evidence, and policy testing without pretending that a licensed or target-facing tool is installed.

The distinction is deliberate:

| Runtime state | Meaning |
|---|---|
| `controlled-validator` | Self-contained lab adapter; simulation-only and verified locally. |
| `external-artifact-required` | Vendor/licensed artifact is not bundled and cannot be claimed as available. |
| `target-execution-disabled` | Target-facing execution is blocked by default regardless of adapter name. |

`Dockerfile.tools` is the reproducible lab image. It contains the controlled validator, the custom artifact runner, the tool pack manifest, and the smoke test. It does not clone external repositories, install third-party binaries, fetch Python packages, require cloud credentials, or create an egress path.

The runtime contract still preserves the adapter catalog and safety policies. This allows the rest of the control plane to test capability selection, scope validation, approval gates, lifecycle phases, evidence provenance, and fail-closed behavior without converting metadata into an unrestricted attack surface.
