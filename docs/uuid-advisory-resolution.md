# UUID transitive advisory resolution

## Status

The Mermaid dependency path is remediated with a scoped pnpm override in `pnpm-workspace.yaml`:

```yaml
overrides:
  mermaid>uuid: 11.1.1
```

`mermaid@11.17.2` accepts `uuid` versions in the `^11.1.0 || ^12 || ^13 || ^14` range, so `uuid@11.1.1` remains compatible with Mermaid.

## Verification

The following checks passed after regenerating the lockfile with pnpm `10.18.3`:

| Check | Result |
| --- | --- |
| `pnpm check` | Passed |
| `pnpm test -- --run` | 77 test files passed; 236 tests passed; 3 skipped |
| `pnpm build` | Passed |
| Mermaid dependency path | Resolves to `uuid@11.1.1` |

A separate compatibility experiment applied `gaxios>uuid: 11.1.1`. Type-check, tests, build, and runtime smoke imports for `GoogleAuth`, `Storage`, `gaxios`, Mermaid, and `uuid.v4` passed. However, the production audit remained moderate because the remaining vulnerable path is:

```text
firebase-admin > @google-cloud/storage > teeny-request > uuid@9.0.1
```

Therefore, the `gaxios>uuid` experiment was rolled back. It did not fully remediate the advisory and would introduce a major-version compatibility change in a package that declares `uuid@^9.0.1`.

## Follow-up

The remaining advisory is an upstream transitive dependency issue in the Firebase/Google Cloud Storage chain. It is intentionally not suppressed with `auditConfig.ignoreCves`. Revisit remediation when `@google-cloud/storage`, `teeny-request`, or the Firebase dependency chain publishes a compatible patched resolution. Any future override of `teeny-request>uuid` must be treated as a compatibility change and must repeat Firebase Admin initialization, authentication token verification, Storage upload/download/metadata/signed-URL, retry/timeout/error-handling, and runtime module export tests.

## References

1. [pnpm settings: overrides](https://pnpm.io/settings#overrides)
2. [uuid npm package](https://www.npmjs.com/package/uuid)
3. [gaxios npm package](https://www.npmjs.com/package/gaxios)
4. [GitHub advisory GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
