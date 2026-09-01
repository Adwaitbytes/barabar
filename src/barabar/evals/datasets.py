"""Materialise a generated month on disk in the shapes a merchant would actually
upload: Razorpay JSON, the bank's CSV layout, the ledger CSV — plus ground truth."""

from __future__ import annotations

import json
from pathlib import Path

from barabar.adapters.bank_csv import read_bank_csv, write_bank_csv
from barabar.adapters.ledger_csv import read_ledger_csv, write_ledger_csv
from barabar.adapters.razorpay_json import read_razorpay_dir, write_razorpay_dir
from barabar.core.hashing import canonical_json
from barabar.core.models import Bank, Month
from barabar.generator.engine import GeneratedMonth
from barabar.simulator.truth import GroundTruth


def write_dataset(gen: GeneratedMonth, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    write_razorpay_dir(gen.month, out)
    bank = gen.month.bank_txns[0].bank if gen.month.bank_txns else Bank.HDFC
    (out / f"bank_statement_{bank.value.lower()}.csv").write_text(
        write_bank_csv(gen.month.bank_txns, bank), encoding="utf-8"
    )
    (out / "ledger.csv").write_text(write_ledger_csv(gen.month.ledger), encoding="utf-8")
    (out / "ground_truth.json").write_text(
        json.dumps(gen.truth.model_dump(mode="json"), indent=1), encoding="utf-8"
    )
    (out / "config.json").write_bytes(canonical_json(gen.config))


def read_dataset(src: Path) -> tuple[Month, GroundTruth | None]:
    parts = read_razorpay_dir(src)
    bank_files = sorted(src.glob("bank_statement_*.csv"))
    bank_txns = (
        read_bank_csv(bank_files[0].read_text(encoding="utf-8"), source_file=bank_files[0].name)
        if bank_files
        else []
    )
    ledger = (
        read_ledger_csv((src / "ledger.csv").read_text(encoding="utf-8"))
        if (src / "ledger.csv").exists()
        else []
    )
    cfg = json.loads((src / "config.json").read_text(encoding="utf-8"))
    from datetime import date

    month = Month(
        as_of=date.fromisoformat(cfg["as_of"]),
        bank_txns=tuple(bank_txns),
        ledger=tuple(ledger),
        **parts,
    )
    truth_path = src / "ground_truth.json"
    truth = (
        GroundTruth.model_validate_json(truth_path.read_text(encoding="utf-8"))
        if truth_path.exists()
        else None
    )
    return month, truth
