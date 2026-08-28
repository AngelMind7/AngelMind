"""Deterministic, network-free research planning from user-provided observations."""

from __future__ import annotations

from dataclasses import dataclass

from .contracts import GovernanceTier, Hypothesis, Observation, Scope, Task
from .guardrails import evaluate_task


@dataclass(frozen=True, slots=True)
class PlannedResearch:
    """A safe plan that can be reviewed or rehearsed, but never executes tools."""

    workspace_id: str
    tasks: tuple[Task, ...]
    estimated_cost_cents: int
    estimated_minutes: int
    blocked_reasons: tuple[str, ...]
    network_calls: int = 0
    tool_executions: int = 0
    simulation_only: bool = True


def build_hypotheses(observations: tuple[Observation, ...]) -> tuple[Hypothesis, ...]:
    """Create reviewable hypotheses from observations without making claims of exploitation."""
    grouped: dict[tuple[str, str], list[Observation]] = {}
    for observation in observations:
        key = (observation.workspace_id, observation.asset_id)
        grouped.setdefault(key, []).append(observation)

    hypotheses: list[Hypothesis] = []
    for (workspace_id, asset_id), asset_observations in sorted(grouped.items()):
        observation_ids = tuple(item.observation_id for item in asset_observations)
        hypotheses.append(
            Hypothesis(
                workspace_id=workspace_id,
                observation_ids=observation_ids,
                statement=f"Review supplied observations for asset {asset_id}; do not infer exploitability without evidence.",
            )
        )
    return tuple(hypotheses)


def plan_research(
    scope: Scope,
    observations: tuple[Observation, ...],
    budget_cents: int,
    session_minutes: int,
) -> PlannedResearch:
    """Build an ordered Tier 1 review plan and collect deterministic blocking reasons."""
    if any(observation.workspace_id != scope.workspace_id for observation in observations):
        return PlannedResearch(scope.workspace_id, (), 0, 0, ("Workspace isolation violation in observations.",))

    hypotheses = build_hypotheses(observations)
    tasks = tuple(
        Task(
            workspace_id=scope.workspace_id,
            hypothesis_id=hypothesis.hypothesis_id,
            title=f"Review: {hypothesis.statement}",
            tier=GovernanceTier.TIER_1,
            dry_run=True,
        )
        for hypothesis in hypotheses
    )
    estimated_cost = len(tasks) * 12
    estimated_minutes = len(tasks) * 5
    blocked: list[str] = []
    for task, observation in zip(tasks, observations):
        if not observation.hostname.strip():
            blocked.append("Observation hostname is required for deterministic scope validation.")
            continue
        decision = evaluate_task(task, observation.hostname, scope, budget_cents - estimated_cost, session_minutes - estimated_minutes)
        blocked.extend(decision.reasons)

    return PlannedResearch(
        workspace_id=scope.workspace_id,
        tasks=tasks,
        estimated_cost_cents=estimated_cost,
        estimated_minutes=estimated_minutes,
        blocked_reasons=tuple(dict.fromkeys(blocked)),
    )
