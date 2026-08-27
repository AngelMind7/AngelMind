# AngelMind Python Research Foundation

This package is the Python 3.12+ reference implementation of the core safety contract. It contains only immutable domain models, deterministic scope and governance guards, and a network-free rehearsal primitive. It intentionally has no scanner, HTTP client, browser automation, credential loader, fingerprint rotation, or active research capability.

```bash
cd research-service
python -m pip install -e '.[dev]'
PYTHONPATH=src pytest
```

The main invariants are that scope exclusions win over allowlists, Tier 3 never proceeds without an external human approval process, workspace identifiers cannot cross the guardrail boundary, and rehearsal always reports zero network calls and tool executions.
