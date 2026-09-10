#!/usr/bin/env sh
set -eu

name="${ANGELMIND_VALIDATOR_NAME:-$(basename "$0") }"
name=$(printf '%s' "$name" | tr -d ' ')
case "${1:-}" in
  --version|-version)
    printf '%s controlled-validator 1.0.0\n' "$name"
    ;;
  --help|-h|*)
    printf '%s: AngelMind controlled validator; simulation-only; no target traffic\n' "$name"
    printf 'Usage: %s [--version|--help] [fixture]\n' "$name"
    ;;
esac
