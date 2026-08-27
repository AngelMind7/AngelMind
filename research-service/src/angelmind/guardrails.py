"""Pure deterministic safety checks. No network or tool execution is allowed here."""

from __future__ import annotations

from dataclasses import dataclass

from .contracts import GovernanceTier, Scope, Task


def normalized(value: str) -> str:
    return value.strip().lower().removeprefix("https://").removeprefix("http://").rstrip("/")


def matches(pattern: str, hostname: str) -> bool:
    pattern, hostname = normalized(pattern), normalized(hostname)
    if not pattern or not hostname:
        return False
    if pattern.startswith("*."):
        suffix = pattern[1:]
        return hostname.endswith(suffix) and len(hostname) > len(suffix)
    return hostname == pattern


def in_scope(hostname: str, scope: Scope) -> bool:
    return any(matches(item, hostname) for item in scope.allowlist) and not any(
        matches(item, hostname) for item in scope.exclusions
    )


@dataclass(frozen=True, slots=True)
class GuardrailDecision:
    allowed: bool
    reasons: tuple[str, ...]
    network_allowed: bool = False


def evaluate_task(task: Task, hostname: str, scope: Scope, budget_remaining_cents: int, session_remaining_minutes: int) -> GuardrailDecision:
    reasons: list[str] = []
    if task.workspace_id != scope.workspace_id:
        reasons.append("Workspace isolation violation.")
    if not in_scope(hostname, scope):
        reasons.append("Target is outside the declared scope.")
    if not scope.safe_harbor_reference.strip() or not scope.code_of_conduct_reference.strip():
        reasons.append("Safe-harbor and code-of-conduct records are both required.")
    if budget_remaining_cents <= 0:
        reasons.append("Budget ceiling reached.")
    if session_remaining_minutes <= 0:
        reasons.append("Session limit reached.")
    if task.tier is GovernanceTier.TIER_3:
        reasons.append("Tier 3 is blocked pending explicit human approval.")
    # The foundation has no active capability. Dry-run must never allow network access.
    return GuardrailDecision(allowed=not reasons, reasons=tuple(reasons), network_allowed=False)
