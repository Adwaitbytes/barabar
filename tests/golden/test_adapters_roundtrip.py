from datetime import date
from pathlib import Path

import pytest

from barabar.adapters.bank_csv import LAYOUTS, detect_bank, read_bank_csv, write_bank_csv
from barabar.adapters.ledger_csv import read_ledger_csv, write_ledger_csv
from barabar.adapters.razorpay_json import read_razorpay_dir, write_razorpay_dir
from barabar.core.config import MatchConfig
from barabar.core.matching import reconcile
from barabar.core.models import Bank, Month
from barabar.generator.engine import generate


@pytest.mark.parametrize("bank", list(LAYOUTS))
def test_bank_csv_roundtrip_preserves_matching(bank: Bank) -> None:
    g = generate(seed=3, n_orders=80, bank=bank)
    text = write_bank_csv(g.month.bank_txns, bank)
    assert detect_bank(text.splitlines()[0].split(",")) == bank or bank in (
        Bank.HDFC,
        Bank.ICICI,
        Bank.SBI,
        Bank.AXIS,
        Bank.KOTAK,
    )
    back = read_bank_csv(text)
    assert len(back) == len(g.month.bank_txns)
    for a, b in zip(g.month.bank_txns, back, strict=True):
        assert (a.credit, a.debit, a.value_date, a.narration_raw) == (
            b.credit,
            b.debit,
            b.value_date,
            b.narration_raw,
        )
        assert (a.narration.utr_full if a.narration else None) == (
            b.narration.utr_full if b.narration else None
        )
    month2 = g.month.model_copy(update={"bank_txns": tuple(back)})
    assert (
        reconcile(month2, MatchConfig(), "r").outputs_hash()
        == reconcile(g.month, MatchConfig(), "r").outputs_hash()
    )


def test_unknown_layout_rejected() -> None:
    with pytest.raises(ValueError):
        read_bank_csv("foo,bar\n1,2\n")


def test_ledger_csv_roundtrip() -> None:
    g = generate(seed=5, n_orders=50)
    back = read_ledger_csv(write_ledger_csv(g.month.ledger))
    assert back == list(g.month.ledger)


def test_razorpay_json_roundtrip(tmp_path: Path) -> None:
    g = generate(seed=9, n_orders=120)
    write_razorpay_dir(g.month, tmp_path)
    parts = read_razorpay_dir(tmp_path)
    month2 = Month(as_of=g.month.as_of, bank_txns=g.month.bank_txns, ledger=g.month.ledger, **parts)
    assert month2.payments == g.month.payments
    assert month2.recon_lines == g.month.recon_lines
    assert month2.settlements == g.month.settlements
    assert (
        reconcile(month2, MatchConfig(), "r").outputs_hash()
        == reconcile(g.month, MatchConfig(), "r").outputs_hash()
    )
    assert (tmp_path / "razorpay_settlement_recon.json").exists()


def test_bank_dates_parse_per_layout() -> None:
    for bank, layout in LAYOUTS.items():
        assert date(2026, 8, 14).strftime(layout.date_fmt)
        assert bank == layout.bank
