from angelmind.contracts import GovernanceTier, Scope, Task
from angelmind.safe_gateway import ActionClass, ActionProposal, OfflineToolGateway


def scope() -> Scope:
    return Scope(
        workspace_id="ws_1",
        allowlist=("research.example",),
        exclusions=(),
        safe_harbor_reference="policy://safe-harbor",
        code_of_conduct_reference="policy://conduct",
    )


def task(tier: GovernanceTier = GovernanceTier.TIER_1) -> Task:
    return Task(workspace_id="ws_1", hypothesis_id="hyp_1", title="Review stored evidence", tier=tier)


def test_offline_gateway_allows_in_scope_non_network_rehearsal() -> None:
    decision = OfflineToolGateway().authorize(
        ActionProposal(task(), ActionClass.OFFLINE_REHEARSAL, "research.example"),
        scope(),
        budget_remaining_cents=100,
        session_remaining_minutes=30,
    )
    assert decision.allowed is True
    assert decision.network_executed is False
    assert decision.tools_executed == 0


def test_offline_gateway_blocks_network_request_even_in_scope() -> None:
    decision = OfflineToolGateway().authorize(
        ActionProposal(task(), ActionClass.CONTEXT_REVIEW, "research.example", requests_network=True),
        scope(),
        budget_remaining_cents=100,
        session_remaining_minutes=30,
    )
    assert decision.allowed is False
    assert any("Network execution" in reason for reason in decision.reasons)


def test_offline_gateway_blocks_offensive_action_class() -> None:
    decision = OfflineToolGateway().authorize(
        ActionProposal(task(), ActionClass.EXPLOIT, "research.example"),
        scope(),
        budget_remaining_cents=100,
        session_remaining_minutes=30,
    )
    assert decision.allowed is False
    assert any("not available" in reason for reason in decision.reasons)


def test_offline_gateway_blocks_tier_three() -> None:
    decision = OfflineToolGateway().authorize(
        ActionProposal(task(GovernanceTier.TIER_3), ActionClass.OFFLINE_REHEARSAL, "research.example"),
        scope(),
        budget_remaining_cents=100,
        session_remaining_minutes=30,
    )
    assert decision.allowed is False
    assert any("Tier 3" in reason for reason in decision.reasons)
