from barabar.agent.narration_fallback import narration_fallback
from barabar.core.models import Bank, TransferMode
from tests.agent.fake_client import FakeClient, ToolUseBlock

WEIRD = "CR/RAZORPAY SOFTWARE PVT LTD/Ref HDFCN26226004471/SETTLEMENT AUG"


def test_fallback_only_runs_on_unparseable_text_and_revalidates_utr() -> None:
    client = FakeClient(
        [
            [
                ToolUseBlock(
                    "t",
                    "extract_narration",
                    {
                        "mode": "NEFT",
                        "utr": "HDFCN26226004471",
                        "counterparty": "RAZORPAY SOFTWARE PVT LTD",
                        "remarks": "SETTLEMENT AUG",
                    },
                )
            ]
        ]
    )
    parsed = narration_fallback(WEIRD, Bank.UNKNOWN, client=client, model="fake")
    assert (
        parsed is not None
        and parsed.utr_full == "HDFCN26226004471"
        and parsed.mode == TransferMode.NEFT
    )
    assert parsed.parser == "llm:fake" and parsed.razorpay_like


def test_fallback_discards_invented_utr() -> None:
    client = FakeClient(
        [
            [
                ToolUseBlock(
                    "t",
                    "extract_narration",
                    {
                        "mode": "NEFT",
                        "utr": "HDFCN99999999999",
                        "counterparty": "RAZORPAY",
                        "remarks": None,
                    },
                )
            ]
        ]
    )
    parsed = narration_fallback("CR/RAZORPAY/SETTLEMENT", Bank.UNKNOWN, client=client, model="fake")
    assert parsed is not None and parsed.utr_full is None and parsed.utr_prefix is None


def test_grammar_wins_when_it_applies() -> None:
    client = FakeClient([])  # must never be called
    parsed = narration_fallback(
        "NEFT-HDFCN26226004471-RAZORPAY SOFTWARE PRIVATE LIMITED-SETTLEMENT",
        Bank.ICICI,
        client=client,
        model="fake",
    )
    assert parsed is not None and parsed.parser == "grammar:ICICI" and client.calls == []
