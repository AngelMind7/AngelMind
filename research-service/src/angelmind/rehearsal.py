"""Network-free task rehearsal with deterministic estimates only."""

from __future__ import annotations

from dataclasses import dataclass

from .contracts import GovernanceTier, Scope, Task
from .guardrails import GuardrailDecision, evaluate_task


@dataclass(frozen=True, slots=True)
class RehearsalResult:
    tasks: tuple[Task, ...]
    estimated_cost_cents: int
    estimated_duration_minutes: int
    network_calls: int
    tool_executions: int
    decision: GuardrailDecision


def rehearse(scope: Scope, hostname: str, budget_remaining_cents: int, session_remaining_minutes: int) -> RehearsalResult:
    task = Task(
        workspace_id=scope.workspace_id,
        hypothesis_id="hypothetical-policy-context",
        title="Parse program rules and build a hypothetical coverage plan",
        tier=GovernanceTier.TIER_1,
        dry_run=True,
    )
    decision = evaluate_task(task, hostname, scope, budget_remaining_cents, session_remaining_minutes)
    return RehearsalResult(
        tasks=(task,),
        estimated_cost_cents=44,
        estimated_duration_minutes=14,
        network_calls=0,
        tool_executions=0,
        decision=decision,
    )
