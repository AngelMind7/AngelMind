# Subfinder verification notes

Source: ProjectDiscovery official documentation, https://docs.projectdiscovery.io/opensource/subfinder/overview and https://docs.projectdiscovery.io/opensource/subfinder/install (accessed 2026-08-31).

Subfinder is documented as a passive subdomain discovery tool using passive online sources. The official overview states that it supports JSON, file, and stdout output. The official installation page documents installation through Go and notes that provider API keys are optional/configured separately for many sources. For AngelMind, activation must therefore use a fixed domain argument, passive-only flags, bounded timeout/output, workspace allowlist validation, and no provider credentials by default. The Docker image should pin a release or build version rather than use an unpinned latest install.

## Additional batch verification notes

Source: ProjectDiscovery official dnsx documentation, https://docs.projectdiscovery.io/opensource/dnsx/usage (accessed 2026-08-31). dnsx supports a single domain input, fixed DNS record queries, JSONL output, silent mode, thread/rate limits, retry control, and disabled update checks. These options are suitable for a constrained passive-readonly adapter.

Source: Yamato-Security official Hayabusa repository, https://github.com/Yamato-Security/hayabusa (accessed 2026-08-31). Hayabusa is a Windows event-log forensic and threat-hunting timeline generator supporting CSV/JSON/JSONL output and offline analysis. The official v4.0.0 Linux x64 GNU release was identified, but activating it requires pinning the binary and a compatible ruleset in the Docker image; this remains a separate batch because its rules and artifact-directory contract need dedicated tests.
