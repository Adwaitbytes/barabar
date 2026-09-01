"""Sales ledger in the documented CSV schema (``docs/DATA-MODEL.md``). Amounts are
rupees with two decimals in the file, integer paise in memory."""

from __future__ import annotations

import csv
import io
from collections.abc import Iterable
from datetime import date

from barabar.core.models import LedgerEntry, LedgerStatus
from barabar.core.money import format_inr, parse_inr

LEDGER_HEADER = (
    "ledger_id",
    "invoice_no",
    "customer_ref",
    "order_receipt",
    "payment_ref",
    "date",
    "gross",
    "gst_component",
    "status",
    "source",
    "notes",
)


def write_ledger_csv(entries: Iterable[LedgerEntry]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(LEDGER_HEADER)
    for e in entries:
        w.writerow(
            [
                e.ledger_id,
                e.invoice_no,
                e.customer_ref or "",
                e.order_receipt or "",
                e.payment_ref or "",
                e.date.isoformat(),
                format_inr(e.gross, symbol=False),
                format_inr(e.gst_component, symbol=False) if e.gst_component is not None else "",
                e.status.value,
                e.source,
                e.notes or "",
            ]
        )
    return buf.getvalue()


def read_ledger_csv(text: str, *, source: str | None = None) -> list[LedgerEntry]:
    reader = csv.DictReader(io.StringIO(text))
    missing = [h for h in ("invoice_no", "date", "gross") if h not in (reader.fieldnames or [])]
    if missing:
        raise ValueError(f"ledger CSV missing required columns: {missing}")
    out: list[LedgerEntry] = []
    for n, row in enumerate(reader, start=1):
        out.append(
            LedgerEntry(
                ledger_id=row.get("ledger_id") or f"led_{n:05d}",
                invoice_no=row["invoice_no"],
                customer_ref=row.get("customer_ref") or None,
                order_receipt=row.get("order_receipt") or None,
                payment_ref=row.get("payment_ref") or None,
                date=date.fromisoformat(row["date"]),
                gross=parse_inr(row["gross"]),
                gst_component=parse_inr(row["gst_component"]) if row.get("gst_component") else None,
                status=LedgerStatus(row.get("status") or "paid"),
                source=source or row.get("source") or "csv",
                notes=row.get("notes") or None,
            )
        )
    return out
