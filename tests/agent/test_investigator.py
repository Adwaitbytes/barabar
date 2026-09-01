from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from barabar.agent.guard import check_numbers, extract_money
from barabar.agent.investigator import AgentCache, InvestigatorUnavailableError, ask, investigate
from barabar.core.config import MatchConfig
from barabar.core.exceptions import ExceptionType
from barabar.core.matching import reconcile
from barabar.core.models import ExceptionStatus
from barabar.generator.engine import generate
from tests.agent.fake_client import FakeClient, TextBlock, ToolUseBlock

CFG = MatchConfig()


def _truncated_case():  # type: ignore[no-untyped-def]
    g = generate(seed=42, n_orders=600)
    r = reconcile(g.month, CFG, "run")
    exc = next(e for e in r.exceptions if e.type == ExceptionType.NARRATION_TRUNCATED_UTR)
    return g.month, r, exc


def test_investigator_loop_collects_evidence_and_submits(tmp_path: Path) -> None:
    month, result, exc = _truncated_case()
    sref = next(x for x in exc.entities if x.startswith("settlement:")).split(":", 1)[1]
    bref = next(x for x in exc.entities if x.startswith("bank:")).split(":", 1)[1]
    bank_row = next(t for t in month.bank_txns if t.bank_txn_id == bref)
    script = [
        [ToolUseBlock("t1", "get_exception", {"exc_id": exc.exc_id})],
        [
            ToolUseBlock("t2", "get_settlement", {"settlement_id": sref}),
            ToolUseBlock(
                "t3",
                "search_bank",
                {
                    "amount": exc.amount,
                    "date_from": None,
                    "date_to": None,
                    "narration_like": "RAZORPAY",
                    "limit": 5,
                },
            ),
        ],
        [
            TextBlock("Prefix and amount agree."),
            ToolUseBlock(
                "t4",
                "submit_hypothesis",
                {
                    "type_proposed": "NARRATION_TRUNCATED_UTR",
                    "confidence": 0.9,
                    "suggested_action": "Accept the candidate link; the bank export truncated the UTR.",
                    "draft_note": f"Bank row {bank_row.bank_txn_id} for {exc.amount_display if hasattr(exc, 'amount_display') else ''} carries a UTR prefix matching settlement {sref}; amount and value date agree.",
                    "alternative_rejected": "UNKNOWN_BANK_CREDIT: rejected because the prefix matches this settlement's UTR and no other settlement has this amount that day.",
                },
            ),
        ],
    ]
    client = FakeClient(script)
    card, cached, model = investigate(
        month,
        result,
        CFG,
        exc.exc_id,
        client=client,
        cache=AgentCache(tmp_path),
        model="fake-model",
    )
    assert not cached and model == "fake-model"
    assert card.type_proposed == ExceptionType.NARRATION_TRUNCATED_UTR
    assert len(card.evidence) == 3 and all(e.result_hash for e in card.evidence)
    assert "UNKNOWN_BANK_CREDIT" in card.alternative_rejected
    # tool schemas are strict and there is no write tool
    tools = client.calls[0]["tools"]
    assert all(t.get("strict") for t in tools)
    assert not any(
        any(w in t["name"] for w in ("create", "update", "delete", "resolve", "accept"))
        for t in tools
    )
    # second call is served from cache without touching the client
    card2, cached2, _ = investigate(
        month,
        result,
        CFG,
        exc.exc_id,
        client=FakeClient([]),
        cache=AgentCache(tmp_path),
        model="fake-model",
    )
    assert cached2 and card2 == card


def test_investigator_rejects_single_evidence(tmp_path: Path) -> None:
    month, result, exc = _truncated_case()
    script = [
        [
            ToolUseBlock(
                "t1",
                "submit_hypothesis",
                {
                    "type_proposed": "ADJUSTMENT",
                    "confidence": 0.9,
                    "suggested_action": "x",
                    "draft_note": "y",
                    "alternative_rejected": "z",
                },
            )
        ]
    ]
    with pytest.raises(InvestigatorUnavailableError):
        investigate(
            month,
            result,
            CFG,
            exc.exc_id,
            client=FakeClient(script),
            cache=AgentCache(tmp_path),
            model="fake",
        )


def test_numberguard_blocks_invented_figures() -> None:
    allowed = {18_341_237, 342_000}
    ok = check_numbers("Net ₹1,83,412.37 after fees of ₹3,420.00.", allowed)
    assert ok.numbers_checked == 2 and not ok.blocked
    bad = check_numbers("Roughly ₹1,83,412 landed, fees about ₹3,400.", allowed)
    assert bad.blocked and bad.unverified == [
        "₹1,83,412",
        "₹3,400",
    ]  # a rounded figure is an invented figure
    assert extract_money("2 payments and 18% GST") == []  # counts and percentages are not money


def test_ask_guards_the_answer() -> None:
    month, result, _ = _truncated_case()
    s = month.settlements[0]
    good = FakeClient(
        [
            [ToolUseBlock("t1", "get_settlement", {"settlement_id": s.settlement_id})],
            [
                TextBlock(
                    f"Settlement {s.settlement_id} netted {__import__('barabar.core.money', fromlist=['format_inr']).format_inr(s.amount)}."
                )
            ],
        ]
    )
    answer, _ = ask(month, result, CFG, "why did that land?", client=good, model="fake")
    assert (
        not answer.guard.blocked
        and answer.settlement_ids == (s.settlement_id,)
        and len(answer.citations) == 1
    )
    bad = FakeClient([[TextBlock("About ₹9,99,999.99 landed, trust me.")]])
    blocked, _ = ask(month, result, CFG, "how much?", client=bad, model="fake")
    assert blocked.guard.blocked and "could not verify" in blocked.answer


def test_api_returns_503_without_key_and_wires_fake_client(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from barabar.api import app as app_module
    from barabar.api.store import Store

    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("BARABAR_AGENT_CACHE", str(tmp_path))
    app_module._store = Store("sqlite://")
    app_module._agent_client_override = None
    client = TestClient(app_module.app)
    rid = client.post("/runs", json={"source": "synthetic", "n_orders": 120, "seed": 42}).json()[
        "run_id"
    ]
    exc = client.get(f"/runs/{rid}/exceptions", params={"status": "open"}).json()[0]
    assert client.post(f"/runs/{rid}/exceptions/{exc['exc_id']}/investigate").status_code == 503
    assert (
        client.post(f"/runs/{rid}/ask", json={"question": "how much GST on fees?"}).status_code
        == 503
    )
    app_module._agent_client_override = FakeClient(
        [
            [ToolUseBlock("a", "get_exception", {"exc_id": exc["exc_id"]})],
            [ToolUseBlock("b", "get_metrics", {})],
            [
                ToolUseBlock(
                    "c",
                    "submit_hypothesis",
                    {
                        "type_proposed": exc["type"],
                        "confidence": 0.8,
                        "suggested_action": "review",
                        "draft_note": "see evidence",
                        "alternative_rejected": "none plausible",
                    },
                )
            ],
        ]
    )
    r = client.post(f"/runs/{rid}/exceptions/{exc['exc_id']}/investigate")
    assert r.status_code == 200, r.text
    assert (
        r.json()["hypothesis"]["type_proposed"] == exc["type"]
        and len(r.json()["hypothesis"]["evidence"]) == 2
    )
    assert (
        client.get(f"/runs/{rid}/exceptions/{exc['exc_id']}").json()["status"]
        == ExceptionStatus.INVESTIGATING.value
    )
    assert client.get(f"/runs/{rid}/exceptions/{exc['exc_id']}/hypothesis").json()["cached"] is True
    audit = client.get(f"/runs/{rid}/audit").json()
    assert audit["verified"] and audit["events"][-1]["actor"] == "agent"
    app_module._agent_client_override = None


@pytest.mark.agent
def test_live_investigator_on_truncated_utr(tmp_path: Path) -> None:
    import os

    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.skip("no ANTHROPIC_API_KEY")
    month, result, exc = _truncated_case()
    card, _, _ = investigate(month, result, CFG, exc.exc_id, cache=AgentCache(tmp_path))
    assert card.type_proposed == ExceptionType.NARRATION_TRUNCATED_UTR
    assert len(card.evidence) >= 2


def test_month_level_tools_exist() -> None:
    from barabar.agent.tools import ToolBelt

    month, result, _ = _truncated_case()
    belt = ToolBelt(month, result, CFG)
    facts = belt.call("get_facts", {})
    assert facts["gst_on_fees_itc"] > 0 and facts["gst_on_fees_itc_display"].startswith("₹")
    listing = belt.call("list_settlements", {"limit": 5})
    assert listing["count"] == len(month.settlements) and len(listing["settlements"]) == 5
    assert {"get_facts", "list_settlements"} <= {t["name"] for t in belt.schemas()}
