# Subfinder verification notes

Source: ProjectDiscovery official documentation, https://docs.projectdiscovery.io/opensource/subfinder/overview and https://docs.projectdiscovery.io/opensource/subfinder/install (accessed 2026-08-31).

Subfinder is documented as a passive subdomain discovery tool using passive online sources. The official overview states that it supports JSON, file, and stdout output. The official installation page documents installation through Go and notes that provider API keys are optional/configured separately for many sources. For AngelMind, activation must therefore use a fixed domain argument, passive-only flags, bounded timeout/output, workspace allowlist validation, and no provider credentials by default. The Docker image should pin a release or build version rather than use an unpinned latest install.
