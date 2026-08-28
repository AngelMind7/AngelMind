from angelmind.contracts import Asset, Observation, Scope
from angelmind.planner import build_hypotheses, plan_research


def scope() -> Scope:
    return Scope(
        workspace_id="ws_1",
        allowlist=("app.example",),
        exclusions=("admin.app.example",),
        safe_harbor_reference="safe-harbor-v1",
        code_of_conduct_reference="conduct-v1",
    )


def test_build_hypotheses_groups_observations_by_asset() -> None:
    observations = (
        Observation("ws_1", "asset-a", "title observed", "app.example"),
        Observation("ws_1", "asset-a", "header observed", "app.example"),
        Observation("ws_1", "asset-b", "form observed", "api.example"),
    )
    hypotheses = build_hypotheses(observations)
    assert len(hypotheses) == 2
    assert len(hypotheses[0].observation_ids) == 2
    assert len(hypotheses[1].observation_ids) == 1


def test_plan_is_deterministic_and_network_free() -> None:
    observations = (Observation("ws_1", "asset-a", "supplied passive observation", "app.example"),)
    result = plan_research(scope(), observations, budget_cents=100, session_minutes=20)
    assert len(result.tasks) == 1
    assert result.estimated_cost_cents == 12
    assert result.estimated_minutes == 5
    assert result.network_calls == 0
    assert result.tool_executions == 0
    assert result.simulation_only is True
    assert result.blocked_reasons == ()


def test_plan_rejects_cross_workspace_observations() -> None:
    observation = Observation("ws_other", "asset-a", "foreign observation", "app.example")
    result = plan_research(scope(), (observation,), budget_cents=100, session_minutes=20)
    assert result.tasks == ()
    assert "Workspace isolation violation" in result.blocked_reasons[0]


def test_plan_requires_an_explicit_hostname() -> None:
    observations = (Observation("ws_1", "asset-a", "host omitted"),)
    result = plan_research(scope(), observations, budget_cents=100, session_minutes=20)
    assert "hostname is required" in result.blocked_reasons[0].lower()


def test_plan_respects_exclusion_and_budget() -> None:
    observations = (Observation("ws_1", "asset-a", "excluded observation", "admin.app.example"),)
    result = plan_research(scope(), observations, budget_cents=1, session_minutes=20)
    assert result.tasks
    assert any("outside" in reason.lower() for reason in result.blocked_reasons)
    assert any("budget" in reason.lower() for reason in result.blocked_reasons)
