import pytest

from barabar.core.models import Bank, TransferMode
from barabar.core.narration import parse_narration, render_narration

NEFT = "HDFCN26226004471"
RTGS = "ICICRC2026081400004471"
RRN = "622412345678"


@pytest.mark.parametrize(
    ("bank", "text", "utr", "mode"),
    [
        (
            Bank.HDFC,
            f"NEFT CR-HDFC0000060-RAZORPAY SOFTWARE PRIVATE LIMITED-SETTLEMENT-{NEFT}",
            NEFT,
            TransferMode.NEFT,
        ),
        (
            Bank.HDFC,
            f"NEFT CR/HDFC0000060/RAZORPAY SOFTWARE PVT LTD/SETL/{NEFT}",
            NEFT,
            TransferMode.NEFT,
        ),
        (
            Bank.HDFC,
            f"RTGS CR-{RTGS}-RAZORPAY SOFTWARE PRIVATE LIMITED-SETTLEMENT",
            RTGS,
            TransferMode.RTGS,
        ),
        (
            Bank.ICICI,
            f"NEFT-{NEFT}-RAZORPAY SOFTWARE PRIVATE LIMITED-SETTLEMENT",
            NEFT,
            TransferMode.NEFT,
        ),
        (
            Bank.SBI,
            f"BY TRANSFER-NEFT*{NEFT}*RAZORPAY SOFTWARE PRIVATE LIMITED*SETTLEMENT",
            NEFT,
            TransferMode.NEFT,
        ),
        (
            Bank.AXIS,
            f"NEFT/{NEFT}/RAZORPAY SOFTWARE PRIVATE LIMITED/SETTLEMENT",
            NEFT,
            TransferMode.NEFT,
        ),
        (
            Bank.AXIS,
            f"RTGS/{RTGS}/RAZORPAY SOFTWARE PRIVATE LIMITED/SETTLEMENT",
            RTGS,
            TransferMode.RTGS,
        ),
        (
            Bank.KOTAK,
            f"NEFT/{NEFT}/RAZORPAY SOFTWARE PRIVATE LIMITED/SETTLEMENT",
            NEFT,
            TransferMode.NEFT,
        ),
        (Bank.KOTAK, f"IMPS-{RRN}-RAZORPAY SOFTWARE-SETTLEMENT", RRN, TransferMode.IMPS),
    ],
)
def test_full_utr_parsed_per_bank(bank: Bank, text: str, utr: str, mode: TransferMode) -> None:
    parsed = parse_narration(text, bank)
    assert parsed is not None
    assert parsed.mode == mode
    assert parsed.utr_full == utr
    assert parsed.utr_prefix is None
    assert parsed.razorpay_like
    assert parsed.counterparty is not None and "RAZORPAY" in parsed.counterparty.upper()
    assert parsed.parser == f"grammar:{bank.value}"


def test_hdfc_truncation_at_50_yields_prefix() -> None:
    full = render_narration(Bank.HDFC, TransferMode.NEFT, NEFT)
    cut = render_narration(Bank.HDFC, TransferMode.NEFT, NEFT, max_len=50)
    assert len(full) > 50 and len(cut) == 50
    parsed = parse_narration(cut, Bank.HDFC)
    assert parsed is not None
    # Grammar recognises the bank & counterparty, and the UTR is gone entirely (cut before it).
    assert parsed.utr_full is None
    assert parsed.razorpay_like


def test_hdfc_truncation_mid_utr_yields_prefix() -> None:
    full = render_narration(Bank.HDFC, TransferMode.NEFT, NEFT, remarks="SETL")
    cut = full[: len(full) - 6]  # cut six chars off the trailing UTR
    parsed = parse_narration(cut, Bank.HDFC)
    assert parsed is not None
    assert parsed.utr_full is None
    assert parsed.utr_prefix == NEFT[:-6]
    assert len(parsed.utr_prefix) == 10


def test_icici_utr_survives_truncation_of_remarks() -> None:
    cut = render_narration(Bank.ICICI, TransferMode.NEFT, NEFT, max_len=50)
    parsed = parse_narration(cut, Bank.ICICI)
    assert parsed is not None and parsed.utr_full == NEFT


def test_ifsc_is_not_mistaken_for_utr_prefix() -> None:
    parsed = parse_narration(
        "NEFT CR-HDFC0000060-RAZORPAY SOFTWARE PRIVATE LIMITED-SETT", Bank.HDFC
    )
    assert parsed is not None
    assert parsed.utr_full is None and parsed.utr_prefix is None
    assert parsed.counterparty == "RAZORPAY SOFTWARE PRIVATE LIMITED"


def test_settlement_id_hint_and_non_razorpay() -> None:
    parsed = parse_narration(f"NEFT-{NEFT}-ACME SUPPLIES-setl_Q1xAbCdEfGhIjK", Bank.ICICI)
    assert parsed is not None
    assert parsed.settlement_id_hint == "setl_Q1xAbCdEfGhIjK"
    assert not parsed.razorpay_like


@pytest.mark.parametrize("text", ["", "ATM WDL 1234", "UPI/123456/coffee", "CHEQUE DEPOSIT 000123"])
def test_unknown_layouts_return_none_or_non_settlement(text: str) -> None:
    parsed = parse_narration(text)
    assert parsed is None or parsed.utr_full is None


def test_render_parse_roundtrip_all_banks() -> None:
    for bank in (Bank.HDFC, Bank.ICICI, Bank.SBI, Bank.AXIS, Bank.KOTAK):
        for mode, utr in (
            (TransferMode.NEFT, NEFT),
            (TransferMode.RTGS, RTGS),
            (TransferMode.IMPS, RRN),
        ):
            parsed = parse_narration(render_narration(bank, mode, utr), bank)
            assert parsed is not None, (bank, mode)
            assert parsed.utr_full == utr, (bank, mode)
            assert parsed.mode == mode
