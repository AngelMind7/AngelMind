"""AngelMind research foundation.

This package intentionally contains no network client, scanner wrapper, browser driver,
or active testing capability. It is the deterministic contract and guardrail layer that
must be verified before an authorized capability integration is considered.
"""

from .contracts import Asset, Evidence, Finding, Hypothesis, Observation, Run, Scope, Task
from .planner import PlannedResearch, build_hypotheses, plan_research

__all__ = [
    "Asset",
    "Evidence",
    "Finding",
    "Hypothesis",
    "Observation",
    "PlannedResearch",
    "Run",
    "Scope",
    "Task",
    "build_hypotheses",
    "plan_research",
]
