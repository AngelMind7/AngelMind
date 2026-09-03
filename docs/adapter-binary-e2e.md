# Binary Security Adapter E2E Verification

This document defines the reproducible verification contract for the security-tool adapter image. The test is intentionally limited to harmless `--version`/`--help` probes and a local offline fixture; it does not scan an external target, send credentials, or execute arbitrary user code.

## Execution path

The canonical command is `docker build --file Dockerfile.tools --tag angelmind-tools:<sha> .` followed by `docker run --rm angelmind-tools:<sha>`. GitHub Actions runs this sequence in `.github/workflows/container.yml` on every push to `main` and pull request. The container entrypoint is `scripts/runtime-tool-smoke-test.sh`.

The smoke test fails when a provisioned command is absent, cannot produce a harmless help/version response within 15 seconds, or when the repository custom runner cannot process a local fixture. A command being present in the catalog is not accepted as proof of operational readiness.

## Adapter matrix

| Adapter command | Provisioning | Version/source contract | E2E status | Target access |
|---|---|---|---|---|
| `ffuf` | Pinned Go binary | `FFUF_VERSION` | Executed by container smoke test | Not used |
| `dalfox` | Pinned Go binary | `DALFOX_VERSION` | Executed by container smoke test | Not used |
| `interactsh-client` | Pinned Go binary | `INTERACTSH_VERSION` | Executed by container smoke test | Not used |
| `cloudfox` | Pinned Go binary | `CLOUDFOX_VERSION` | Executed by container smoke test | Not used |
| `nuclei` | Pinned Go binary | `NUCLEI_VERSION` | Executed by container smoke test | Not used |
| `subfinder` | Pinned Go binary | `SUBFINDER_VERSION` | Executed by container smoke test | Not used |
| `httpx` | Pinned Go binary | `HTTPX_VERSION` | Executed by container smoke test | Not used |
| `gitleaks` | Pinned Go binary | `GITLEAKS_VERSION` | Executed by container smoke test | Not used |
| `trivy` | Pinned Go binary | `TRIVY_VERSION` | Executed by container smoke test | Not used |
| `sqlmap` | Pinned source checkout | `SQLMAP_VERSION` | Executed by container smoke test | Not used |
| `jwt_tool.py` | Source checkout | `JWT_TOOL_REF=3bc7407cf2222d6a821dcc19c776e5a1b1cb9a9b` | Executed by container smoke test | Not used |
| `custom_scripts` | Repository runtime | `runtime/custom_script_runner.py` | Executes offline fixture test | Network-free |
| `burp-rest-cli` | Vendor artifact | Supplied separately with license/checksum | Not present unless supplied | Disabled in default image |
| `ssrfmap` | Custom/source adapter | Supplied separately after review | Not present in default image | Disabled in default image |
| `graphql-cop` | Custom/source adapter | Supplied separately after review | Not present in default image | Disabled in default image |

## Interpretation of results

A passing tools-image smoke test proves that the provisioned commands start and respond to a harmless probe. It does not prove that a target-facing operation is authorized, safe, or effective. Target-facing execution still requires workspace authorization, scope and exclusion validation, risk policy, approval, rate limits, isolated worker execution, normalized evidence, and an audit record.

The three external/custom artifacts are deliberately reported as `EXTERNAL_ARTIFACT_REQUIRED`. They must not be replaced by a fake executable merely to make the smoke test green. Burp requires a licensed vendor artifact. SSRFmap and GraphQL-Cop require an independently reviewed adapter/source package and explicit capability approval.

## Updating versions

Version changes must update the corresponding `ARG` in `Dockerfile.tools`, the runtime manifest, and this matrix in the same pull request. Go-installed tools must remain referenced by an immutable release tag. Source checkouts must use an immutable tag or commit rather than a moving branch. After an update, run the container workflow and retain its log as the verification evidence.

## Known environment limitations

The default production image remains passive/offline by design and is separate from `Dockerfile.tools`. Docker is not installed in the development sandbox; therefore direct image execution is performed by the GitHub Actions runner. Staging database verification and authenticated browser E2E require configured staging secrets and a non-production HTTPS base URL; their absence must remain a visible failed or skipped environment prerequisite, never be represented as a successful adapter test.
