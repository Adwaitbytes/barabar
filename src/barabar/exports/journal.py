"""Journal entries drafted from a run. Amounts and accounts are code (templates);
only the narration text may be prose. One balanced voucher per settlement batch."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Literal

from barabar.core.calendar import IST
from barabar.core.models import Month, ReconLineType, RzReconLine, RzSettlement, SettlementStatus
from barabar.core.money import format_inr
from barabar.core.result import ReconResult

GstSplit = Literal["igst", "cgst_sgst"]


@dataclass(frozen=True)
class Accounts:
    bank: str = "HDFC Bank"
    receivable: str = "Razorpay Receivable"
    pg_charges: str = "Payment Gateway Charges"
    igst_input: str = "Input IGST on PG Charges"
    cgst_input: str = "Input CGST on PG Charges"
    sgst_input: str = "Input SGST on PG Charges"
    sales_returns: str = "Sales Returns"
    chargeback_loss: str = "Chargeback Losses"
    chargeback_recovery: str = "Chargeback Recoveries"
    adjustments: str = "Razorpay Adjustments"
    rounding: str = "Rounding Off"


@dataclass(frozen=True)
class Line:
    ledger: str
    debit: int = 0
    credit: int = 0

    def __post_init__(self) -> None:
        if self.debit < 0 or self.credit < 0 or (self.debit and self.credit):
            raise ValueError(f"a journal line is one-sided and non-negative: {self}")


@dataclass(frozen=True)
class Voucher:
    voucher_no: str
    date: date
    narration: str
    lines: tuple[Line, ...]
    settlement_id: str

    @property
    def balanced(self) -> bool:
        return sum(x.debit for x in self.lines) == sum(x.credit for x in self.lines)


def vouchers_for_run(
    month: Month,
    result: ReconResult,
    *,
    accounts: Accounts | None = None,
    gst_split: GstSplit = "igst",
) -> list[Voucher]:
    acc = accounts or Accounts()
    matched = {
        link.to_entity.split(":", 1)[1]
        for link in result.links
        if link.from_entity.startswith("bank:") and link.to_entity.startswith("settlement:")
    }
    lines_by_setl: dict[str, list[RzReconLine]] = {}
    for ln in month.recon_lines:
        if ln.settlement_id and ln.settled and not ln.on_hold:
            lines_by_setl.setdefault(ln.settlement_id, []).append(ln)
    out: list[Voucher] = []
    for n, s in enumerate(
        sorted(
            (s for s in month.settlements if s.status == SettlementStatus.PROCESSED),
            key=lambda s: (s.settled_at or s.created_at, s.settlement_id),
        ),
        start=1,
    ):
        lines = lines_by_setl.get(s.settlement_id, [])
        gross = sum(ln.amount for ln in lines if ln.type == ReconLineType.PAYMENT)
        fee = sum(ln.fee for ln in lines if ln.type == ReconLineType.PAYMENT)
        tax = sum(ln.tax for ln in lines if ln.type == ReconLineType.PAYMENT)
        refunds = sum(ln.debit for ln in lines if ln.type == ReconLineType.REFUND)
        cb_debit = sum(ln.debit for ln in lines if ln.dispute_id)
        cb_credit = sum(ln.credit for ln in lines if ln.dispute_id)
        adj_debit = sum(
            ln.debit for ln in lines if ln.type == ReconLineType.ADJUSTMENT and not ln.dispute_id
        )
        adj_credit = sum(
            ln.credit for ln in lines if ln.type == ReconLineType.ADJUSTMENT and not ln.dispute_id
        )
        net = gross - fee - tax - refunds - cb_debit + cb_credit + adj_credit - adj_debit
        rounding = s.amount - net
        entries: list[Line] = [Line(acc.bank, debit=s.amount)]
        if fee:
            entries.append(Line(acc.pg_charges, debit=fee))
        if tax:
            if gst_split == "igst":
                entries.append(Line(acc.igst_input, debit=tax))
            else:
                half = tax // 2
                entries.append(Line(acc.cgst_input, debit=half))
                entries.append(Line(acc.sgst_input, debit=tax - half))
        if refunds:
            entries.append(Line(acc.sales_returns, debit=refunds))
        if cb_debit:
            entries.append(Line(acc.chargeback_loss, debit=cb_debit))
        if adj_debit:
            entries.append(Line(acc.adjustments, debit=adj_debit))
        if gross:
            entries.append(Line(acc.receivable, credit=gross))
        if cb_credit:
            entries.append(Line(acc.chargeback_recovery, credit=cb_credit))
        if adj_credit:
            entries.append(Line(acc.adjustments, credit=adj_credit))
        if rounding > 0:
            entries.append(Line(acc.rounding, credit=rounding))
        elif rounding < 0:
            entries.append(Line(acc.rounding, debit=-rounding))
        when = (s.settled_at or s.created_at).astimezone(IST).date()
        status = (
            "bank credit matched"
            if s.settlement_id in matched
            else "bank credit NOT matched, review before posting"
        )
        narration = (
            f"Razorpay settlement {s.settlement_id} UTR {s.utr or 'n/a'}: {len([ln for ln in lines if ln.type == ReconLineType.PAYMENT])} payments gross {format_inr(gross)}, "
            f"PG fee {format_inr(fee)}, GST {format_inr(tax)}, refunds {format_inr(refunds)}, chargebacks {format_inr(cb_debit)}; net {format_inr(s.amount)} ({status})"
        )
        v = Voucher(
            voucher_no=f"RZP/{when:%Y%m}/{n:04d}",
            date=when,
            narration=narration,
            lines=tuple(entries),
            settlement_id=s.settlement_id,
        )
        assert v.balanced, v
        out.append(v)
    return out


def journal_csv(vouchers: list[Voucher]) -> str:
    import csv
    import io

    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["date", "voucher_no", "ledger", "debit", "credit", "narration", "settlement_id"])
    for v in vouchers:
        for ln in v.lines:
            w.writerow(
                [
                    v.date.isoformat(),
                    v.voucher_no,
                    ln.ledger,
                    format_inr(ln.debit, symbol=False) if ln.debit else "",
                    format_inr(ln.credit, symbol=False) if ln.credit else "",
                    v.narration,
                    v.settlement_id,
                ]
            )
    return buf.getvalue()


def settlement_by_id(month: Month) -> dict[str, RzSettlement]:
    return {s.settlement_id: s for s in month.settlements}
