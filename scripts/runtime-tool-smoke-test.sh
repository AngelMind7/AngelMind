#!/usr/bin/env sh
set -eu

# Never report catalog metadata as operational: verify executable presence and
# ask each tool for a harmless version/help response only.
required="ffuf dalfox interactsh-client cloudfox nuclei subfinder httpx gitleaks trivy sqlmap jwt_tool.py"
missing=0
for command in $required; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "MISSING $command" >&2
    missing=1
    continue
  fi
  printf 'FOUND %s: ' "$command"
  "$command" --version 2>&1 | head -n 1 || "$command" -version 2>&1 | head -n 1 || true
done

# These are intentionally external artifacts, not downloadable substitutes.
for command in burp-rest-cli ssrfmap graphql-cop; do
  if command -v "$command" >/dev/null 2>&1; then
    echo "FOUND $command"
  else
    echo "EXTERNAL_ARTIFACT_REQUIRED $command"
  fi
done

[ "$missing" -eq 0 ] || exit 1
