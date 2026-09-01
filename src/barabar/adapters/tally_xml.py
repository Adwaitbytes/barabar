"""Tally Prime Day Book XML export → ledger entries. Tally exports vouchers as
``<VOUCHER VCHTYPE="Sales">`` with ``ALLLEDGERENTRIES.LIST`` lines; the party
ledger line carries the gross (credit to Sales = positive amount in Tally's
sign convention), the narration often holds the Razorpay payment or receipt id."""

from __future__ import annotations

import re
from datetime import datetime
from xml.etree import ElementTree as ET

from barabar.core.models import LedgerEntry, LedgerStatus
from barabar.core.money import parse_inr

_PAY_RE = re.compile(r"\b(pay_[A-Za-z0-9]{14})\b")
_RCPT_RE = re.compile(r"\b(rcpt_[A-Za-z0-9_]+)\b")
_RFND_RE = re.compile(r"\b(rfnd_[A-Za-z0-9]{14})\b")


def _text(el: ET.Element | None, default: str = "") -> str:
    return (el.text or default).strip() if el is not None else default


def read_tally_daybook(xml_text: str, *, sales_ledger_hint: str = "Sales") -> list[LedgerEntry]:
    root = ET.fromstring(xml_text)
    out: list[LedgerEntry] = []
    for n, v in enumerate(root.iter("VOUCHER"), start=1):
        vtype = (v.get("VCHTYPE") or _text(v.find("VOUCHERTYPENAME"))).lower()
        if vtype not in ("sales", "credit note", "receipt", "journal"):
            continue
        date_raw = _text(v.find("DATE"))
        if not date_raw:
            continue
        when = datetime.strptime(date_raw, "%Y%m%d").date()
        narration = _text(v.find("NARRATION"))
        voucher_no = _text(v.find("VOUCHERNUMBER")) or f"TALLY/{n}"
        party = _text(v.find("PARTYLEDGERNAME")) or None
        gross = 0
        for entry in v.findall("ALLLEDGERENTRIES.LIST"):
            ledger_name = _text(entry.find("LEDGERNAME"))
            amount = parse_inr(_text(entry.find("AMOUNT"), "0"))
            if sales_ledger_hint.lower() in ledger_name.lower():
                gross += amount  # Tally: credits are positive
        if gross == 0:
            continue
        is_credit_note = vtype == "credit note"
        pay = _PAY_RE.search(narration)
        rcpt = _RCPT_RE.search(narration)
        rfnd = _RFND_RE.search(narration)
        out.append(
            LedgerEntry(
                ledger_id=f"tally_{n:05d}",
                invoice_no=voucher_no,
                customer_ref=party,
                order_receipt=rcpt.group(1) if rcpt else None,
                payment_ref=(
                    rfnd.group(1) if (is_credit_note and rfnd) else (pay.group(1) if pay else None)
                ),
                date=when,
                gross=-abs(gross) if is_credit_note else abs(gross),
                status=LedgerStatus.PAID,
                source="tally",
                notes=narration or None,
            )
        )
    return out
