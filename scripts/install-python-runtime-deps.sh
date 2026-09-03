#!/usr/bin/env bash
set -Eeuo pipefail

# Install each runtime analyzer independently so a failed package is observable
# and retryable in Docker logs. All versions are intentionally pinned.
packages=(
  'checkov==3.3.16'
  'checkdmarc==6.0.0'
  'cyclonedx-bom==4.6.1'
  'dkimpy==1.1.8'
  'detect-secrets==1.5.0'
  'njsscan==1.0.0'
  'pip-audit==2.10.1'
  'semgrep==1.172.0'
  'safety==3.8.1'
  'sigmatools==0.23.1'
  'volatility3==2.28.0'
)

export PIP_DISABLE_PIP_VERSION_CHECK=1
export PIP_DEFAULT_TIMEOUT=120
python3 -m pip install --no-cache-dir --break-system-packages --upgrade pip
for package in "${packages[@]}"; do
  printf 'Installing runtime dependency %s\n' "$package"
  success=0
  for attempt in 1 2 3; do
    if python3 -m pip install --no-cache-dir --break-system-packages --prefer-binary --timeout 120 "$package"; then
      success=1
      break
    fi
    printf 'Retry %s/3 for %s\n' "$attempt" "$package" >&2
    sleep 3
  done
  if [ "$success" -ne 1 ]; then
    printf 'FATAL: runtime dependency failed: %s\n' "$package" >&2
    exit 1
  fi
done
python3 -m pip check
