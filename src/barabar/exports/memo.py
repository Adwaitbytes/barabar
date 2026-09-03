"""Month-end controller's memo, drafted deterministically from the run's
structured numbers. An LLM may polish the prose later; NumberGuard checks that
every figure it emits exists in this structure."""

from __future__ import annotations

from collections import Counter
from datetime import date

from barabar.core.models import ExceptionStatus, Month, ReconLineType
from barabar.core.money import format_inr
from barabar.core.result import ReconResult


def memo_facts(month: Month, result: ReconResult) -> dict[str, int | float | str]:
    m = result.metrics
    tax_total = sum(
        ln.tax for ln in month.recon_lines if ln.type == ReconLineType.PAYMENT and ln.settled
    )
    fee_total = sum(
        ln.fee for ln in month.recon_lines if ln.type == ReconLineType.PAYMENT and ln.settled
    )
    refunds = sum(ln.debit for ln in month.recon_lines if ln.type == ReconLineType.REFUND)
    cb = sum(ln.debit for ln in month.recon_lines if ln.dispute_id)
    open_exc = [e for e in result.exceptions if e.status == ExceptionStatus.OPEN]
    return {
        "as_of": month.as_of.isoformat(),
        "gross_captured": int(m["gross_captured_paise"]),
        "explained": int(m["explained_paise"]),
        "unexplained": int(m["unexplained_paise"]),
        "rupees_explained_pct": float(m["rupees_explained_pct"]),
        "settlements_processed": int(m["settlements_processed"]),
        "settlements_matched": int(m["settlements_matched_to_bank"]),
        "pg_fees": fee_total,
        "gst_on_fees_itc": tax_total,
        "refunds_netted": refunds,
        "chargebacks_debited": cb,
        "exceptions_total": int(m["exceptions_total"]),
        "exceptions_open": len(open_exc),
        "exceptions_auto_resolved": int(m["exceptions_auto_resolved"]),
        "open_amount": sum(e.amount for e in open_exc),
    }


def controller_memo(month: Month, result: ReconResult, *, on: date | None = None) -> str:
    f = memo_facts(month, result)
    open_exc = [e for e in result.exceptions if e.status == ExceptionStatus.OPEN]
    by_type = Counter(e.type.value for e in open_exc)
    lines = [
        f"# Month-end controller's memo, as of {f['as_of']}",
        "",
        f"Gross captured through Razorpay: **{format_inr(int(f['gross_captured']))}**. "
        f"Explained to the paise: **{format_inr(int(f['explained']))}** ({f['rupees_explained_pct']}%). "
        f"Still unexplained: **{format_inr(int(f['unexplained']))}**.",
        "",
        f"{f['settlements_matched']} of {f['settlements_processed']} processed settlements are matched to a bank credit. "
        f"Payment-gateway fees for the period total {format_inr(int(f['pg_fees']))}; GST on those fees, claimable as input tax credit against Razorpay's monthly tax invoice, totals **{format_inr(int(f['gst_on_fees_itc']))}** (GSTR-3B table 4A(5)).",
        "",
        f"Refunds netted inside settlements: {format_inr(int(f['refunds_netted']))}. Chargebacks debited: {format_inr(int(f['chargebacks_debited']))}.",
        "",
        f"The run produced {f['exceptions_total']} typed exceptions: {f['exceptions_auto_resolved']} auto-resolved by rule, {f['exceptions_open']} open for review totalling {format_inr(int(f['open_amount']))}.",
        "",
        "## What still needs a human",
        "",
    ]
    for t, n in by_type.most_common():
        amt = sum(e.amount for e in open_exc if e.type.value == t)
        lines.append(f"- `{t}` x {n}: {format_inr(amt)}")
    lines += [
        "",
        "_Every number above is taken from the run's structured metrics; nothing was estimated._",
        "",
    ]
    return "\n".join(lines)
