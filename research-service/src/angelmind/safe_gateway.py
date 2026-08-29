from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .contracts import Scope, Task
from .guardrails import evaluate_task


class ActionClass(StrEnum):
    CONTEXT_REVIEW = "context_review"
    EVIDENCE_REVIEW = "evidence_review"
    OFFLINE_REHEARSAL = "offline_rehearsal"
    ACTIVE_PROBE = "active_probe"
    EXPLOIT = "exploit"
    CREDENTIAL_REPLAY = "credential_replay"
    DATA_EXFILTRATION = "data_exfiltration"
    AUTONOMOUS_SUBMISSION = "autonomous_submission"


@dataclass(frozen=True, slots=True)
class ActionProposal:
    task: Task
    action_class: ActionClass
    hostname: str
    estimated_cost_cents: int = 0
    estimated_minutes: int = 0
    requests_network: bool = False


@dataclass(frozen=True, slots=True)
class GatewayDecision:
    allowed: bool
    reasons: tuple[str, ...]
    network_executed: bool = False
    tools_executed: int = 0


_BLOCKED_ACTIONS = frozenset(
    {
        ActionClass.ACTIVE_PROBE,
        ActionClass.EXPLOIT,
        ActionClass.CREDENTIAL_REPLAY,
        ActionClass.DATA_EXFILTRATION,
        ActionClass.AUTONOMOUS_SUBMISSION,
    }
)


class OfflineToolGateway:
    """Deterministic, non-operational gateway for planning and evidence review.

    The gateway intentionally has no execution method. It can authorize an offline
    rehearsal decision, but it cannot create network traffic or invoke a tool.
    """

    def authorize(
        self,
        proposal: ActionProposal,
        scope: Scope,
        budget_remaining_cents: int,
        session_remaining_minutes: int,
    ) -> GatewayDecision:
        guardrail = evaluate_task(
            proposal.task,
            proposal.hostname,
            scope,
            budget_remaining_cents - proposal.estimated_cost_cents,
            session_remaining_minutes - proposal.estimated_minutes,
        )
        reasons = list(guardrail.reasons)
        if proposal.action_class in _BLOCKED_ACTIONS:
            reasons.append(f"Action class '{proposal.action_class}' is not available in offline mode.")
        if proposal.requests_network:
            reasons.append("Network execution is disabled by the offline gateway.")
        if proposal.task.tier.value != "tier1":
            reasons.append("Only Tier 1 offline planning is available in this foundation.")
        return GatewayDecision(allowed=not reasons, reasons=tuple(reasons))
