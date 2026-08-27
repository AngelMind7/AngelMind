from hypothesis import given, strategies as st

from angelmind.contracts import GovernanceTier, Scope, Task
from angelmind.guardrails import evaluate_task, in_scope
from angelmind.rehearsal import rehearse


@given(st.from_regex(r"[a-z]{1,12}\.example\.test", fullmatch=True))
def test_exclusion_always_wins(hostname: str) -> None:
    scope = Scope("ws-1", (hostname,), (hostname,), "safe-harbor", "code-of-conduct")
    assert not in_scope(hostname, scope)


@given(st.from_regex(r"[a-z]{1,12}\.example\.test", fullmatch=True))
def test_tier_three_never_allows_network(hostname: str) -> None:
    scope = Scope("ws-1", (hostname,), (), "safe-harbor", "code-of-conduct")
    task = Task("ws-1", "hyp-1", "Privileged proof", GovernanceTier.TIER_3, dry_run=False)
    decision = evaluate_task(task, hostname, scope, 100, 30)
    assert not decision.allowed
    assert not decision.network_allowed


def test_rehearsal_is_network_free() -> None:
    scope = Scope("ws-1", ("app.example.test",), (), "safe-harbor", "code-of-conduct")
    result = rehearse(scope, "app.example.test", 10_000, 60)
    assert result.network_calls == 0
    assert result.tool_executions == 0
    assert result.tasks[0].dry_run
