#!/usr/bin/env sh
set -eu

# This is an execution smoke test, not catalog metadata: each command must
# start successfully and emit a version/help response without contacting a target.
required="ffuf dalfox interactsh-client cloudfox nuclei subfinder httpx gitleaks trivy sqlmap jwt_tool.py"
missing=0
for command in $required; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "MISSING $command" >&2
    missing=1
    continue
  fi
  probe=""
  for flag in --version -version --help -h; do
    probe=$(timeout 15s "$command" "$flag" 2>&1 | head -n 3 || true)
    if [ -n "$probe" ]; then break; fi
  done
  if [ -z "$probe" ]; then
    echo "FAILED_TO_PROBE $command" >&2
    missing=1
  else
    printf 'EXECUTED %s: %s\n' "$command" "$(printf '%s' "$probe" | tr '\n' ' ' | cut -c 1-240)"
  fi
done

# The following are intentionally external artifacts, not downloadable substitutes.
for command in burp-rest-cli ssrfmap graphql-cop; do
  if command -v "$command" >/dev/null 2>&1; then
    echo "EXECUTED_EXTERNAL_ARTIFACT $command"
  else
    echo "EXTERNAL_ARTIFACT_REQUIRED $command"
  fi
done

fixture=$(mktemp)
trap 'rm -f "$fixture"' EXIT
printf 'offline fixture\n' > "$fixture"
runner_output=$(python3 /app/runtime/custom_script_runner.py "$fixture")
printf '%s\n' "$runner_output" | grep -q 'angelmind.custom-artifact.v1' || { echo "FAILED custom_script_runner" >&2; missing=1; }
echo "EXECUTED custom_script_runner: $runner_output"

[ "$missing" -eq 0 ] || exit 1
