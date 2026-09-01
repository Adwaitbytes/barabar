"""The typed exception taxonomy (PRD §7). Exhaustive for v1, mutually exclusive on
primary type. ``docs/EXCEPTIONS.md`` is rendered from this module and a test keeps
them in sync, so the enum is the single source of truth."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path


class ExceptionType(StrEnum):
    TIMING_NOT_YET_SETTLED = "TIMING_NOT_YET_SETTLED"
    TIMING_BANK_LAG = "TIMING_BANK_LAG"
    TIMING_HOLIDAY_SHIFT = "TIMING_HOLIDAY_SHIFT"
    FEE_VARIANCE = "FEE_VARIANCE"
    TAX_VARIANCE = "TAX_VARIANCE"
    ROUNDING = "ROUNDING"
    REFUND_NETTED = "REFUND_NETTED"
    REFUND_PENDING_NET = "REFUND_PENDING_NET"
    DISPUTE_DEBIT = "DISPUTE_DEBIT"
    DISPUTE_REVERSAL = "DISPUTE_REVERSAL"
    ADJUSTMENT = "ADJUSTMENT"
    ON_HOLD = "ON_HOLD"
    PARTIAL_SETTLEMENT = "PARTIAL_SETTLEMENT"
    INSTANT_SETTLEMENT_FEE = "INSTANT_SETTLEMENT_FEE"
    MULTI_UTR_SPLIT = "MULTI_UTR_SPLIT"
    MISSING_BANK_CREDIT = "MISSING_BANK_CREDIT"
    UNKNOWN_BANK_CREDIT = "UNKNOWN_BANK_CREDIT"
    DUPLICATE_BANK_CREDIT = "DUPLICATE_BANK_CREDIT"
    NARRATION_TRUNCATED_UTR = "NARRATION_TRUNCATED_UTR"
    SETTLEMENT_FAILED_RETURNED = "SETTLEMENT_FAILED_RETURNED"
    ORPHAN_LEDGER_ENTRY = "ORPHAN_LEDGER_ENTRY"
    AMOUNT_MISMATCH_LEDGER = "AMOUNT_MISMATCH_LEDGER"
    DUPLICATE_LEDGER_ENTRY = "DUPLICATE_LEDGER_ENTRY"
    INTL_FX = "INTL_FX"
    MARKETPLACE_TDS_TCS = "MARKETPLACE_TDS_TCS"


@dataclass(frozen=True)
class ExceptionSpec:
    type: ExceptionType
    meaning: str
    detection_rule: str
    suggested_action: str
    auto_resolvable: bool = False
    stretch: bool = False


_SPECS: tuple[ExceptionSpec, ...] = (
    ExceptionSpec(
        ExceptionType.TIMING_NOT_YET_SETTLED,
        "Payment captured, settlement not yet due (T+2 working days not elapsed)",
        "`captured_at + cycle(calendar) > as_of`",
        "Wait; show expected settlement date",
    ),
    ExceptionSpec(
        ExceptionType.TIMING_BANK_LAG,
        "Settlement processed by Razorpay, bank credit not yet visible (<= 1 working day)",
        "`settlement.processed` exists, no bank credit within lag window",
        "Wait; re-check next statement",
    ),
    ExceptionSpec(
        ExceptionType.TIMING_HOLIDAY_SHIFT,
        "Expected date fell on weekend/RBI holiday; landed next working day",
        "Calendar-aware re-date resolves it",
        "Auto-resolve with note",
        auto_resolvable=True,
    ),
    ExceptionSpec(
        ExceptionType.FEE_VARIANCE,
        "Fee != rate card x amount beyond rounding",
        "`abs(fee - expected_fee) > 1 paise`",
        "Verify rate card; raise with Razorpay if persistent",
    ),
    ExceptionSpec(
        ExceptionType.TAX_VARIANCE,
        "Tax != 18% x fee beyond rounding",
        "`abs(tax - round(fee x 0.18)) > 1 paise`",
        "Verify GST invoice",
    ),
    ExceptionSpec(
        ExceptionType.ROUNDING,
        "Sub-rupee residual after netting",
        "`0 < abs(residual) <= tolerance_paise`",
        "Accept as rounding; post to rounding ledger",
        auto_resolvable=True,
    ),
    ExceptionSpec(
        ExceptionType.REFUND_NETTED,
        "A refund reduced this batch; ledger still shows the sale as fully paid",
        "Refund line in batch with no ledger credit note",
        "Post credit note / journal",
    ),
    ExceptionSpec(
        ExceptionType.REFUND_PENDING_NET,
        "Refund processed but not yet netted in any batch",
        "Refund exists; no recon line",
        "Wait; expect debit in next batch",
    ),
    ExceptionSpec(
        ExceptionType.DISPUTE_DEBIT,
        "Chargeback debited inside a batch",
        "Recon line with `dispute_id`, debit",
        "Surface dispute with evidence; hand off",
    ),
    ExceptionSpec(
        ExceptionType.DISPUTE_REVERSAL,
        "Dispute won; amount re-credited",
        "Credit line with `dispute_id`",
        "Post reversal",
    ),
    ExceptionSpec(
        ExceptionType.ADJUSTMENT,
        "Razorpay manual adjustment",
        "`type == adjustment`",
        "Verify with Razorpay support note",
    ),
    ExceptionSpec(
        ExceptionType.ON_HOLD,
        "Line marked `on_hold`",
        "`on_hold == true`",
        "Explain; expect later batch",
    ),
    ExceptionSpec(
        ExceptionType.PARTIAL_SETTLEMENT,
        "Batch settled less than settleable due to balance constraints",
        "`settlement.type == partial` or residual equals a later batch",
        "Link to continuation batch",
    ),
    ExceptionSpec(
        ExceptionType.INSTANT_SETTLEMENT_FEE,
        "Extra fee line for instant settlement",
        "Fee line without payment",
        "Post to bank charges",
    ),
    ExceptionSpec(
        ExceptionType.MULTI_UTR_SPLIT,
        "One settlement arrived as two or more bank credits",
        "Bounded subset-sum over same-day credits equals batch net",
        "Link both; note",
        auto_resolvable=True,
    ),
    ExceptionSpec(
        ExceptionType.MISSING_BANK_CREDIT,
        "Settlement processed > lag window, no bank credit found",
        "Window exceeded",
        "Raise with bank/Razorpay; draft ticket",
    ),
    ExceptionSpec(
        ExceptionType.UNKNOWN_BANK_CREDIT,
        "Bank credit with Razorpay-like narration and no matching settlement",
        "Narration parser tags source = razorpay, no batch",
        "Investigate (tier D)",
    ),
    ExceptionSpec(
        ExceptionType.DUPLICATE_BANK_CREDIT,
        "Same UTR credited twice",
        "UTR seen twice",
        "Flag for bank reversal",
    ),
    ExceptionSpec(
        ExceptionType.NARRATION_TRUNCATED_UTR,
        "UTR cut by bank export; matched by prefix + amount + date",
        "Prefix match >= 10 chars + exact amount + window",
        "Accept with confidence; note",
    ),
    ExceptionSpec(
        ExceptionType.SETTLEMENT_FAILED_RETURNED,
        "Bank rejected settlement; re-credited later",
        "Settlement status failed then reprocessed",
        "Link retry; note",
    ),
    ExceptionSpec(
        ExceptionType.ORPHAN_LEDGER_ENTRY,
        "Ledger invoice with no Razorpay payment (COD? other gateway? manual?)",
        "No payment by receipt/amount/date",
        "Ask user; tag channel",
    ),
    ExceptionSpec(
        ExceptionType.AMOUNT_MISMATCH_LEDGER,
        "Payment and invoice differ (discount, shipping, partial)",
        "Payment != invoice gross",
        "Suggest partial-payment entry",
    ),
    ExceptionSpec(
        ExceptionType.DUPLICATE_LEDGER_ENTRY,
        "Same invoice twice",
        "Duplicate invoice_no/amount/date",
        "Merge",
    ),
    ExceptionSpec(
        ExceptionType.INTL_FX,
        "International payment settled in INR with FX and markup",
        "currency != INR",
        "Explain FX line",
        stretch=True,
    ),
    ExceptionSpec(
        ExceptionType.MARKETPLACE_TDS_TCS,
        "Marketplace settlement with 0.1% 194-O TDS and 0.5% GST TCS lines",
        "Source = marketplace",
        "Post TDS receivable / TCS credit",
        stretch=True,
    ),
)

EXCEPTION_SPECS: dict[ExceptionType, ExceptionSpec] = {s.type: s for s in _SPECS}

V1_TYPES: frozenset[ExceptionType] = frozenset(s.type for s in _SPECS if not s.stretch)


def render_exceptions_md() -> str:
    lines = [
        "# Exception taxonomy",
        "",
        "Rendered from `barabar.core.exceptions` — do not edit by hand "
        "(`make docs` regenerates; a test asserts sync).",
        "",
        "Every unmatched or partially matched item gets exactly one primary type. "
        "Secondary tags are allowed. **Unexplained** is not a type: it is the sum of open "
        "exceptions with confidence below the threshold.",
        "",
        "| Type | Meaning | Detection rule | Default suggested action | Auto | v1 |",
        "|---|---|---|---|---|---|",
    ]
    for s in _SPECS:
        lines.append(
            f"| `{s.type.value}` | {s.meaning} | {s.detection_rule} | {s.suggested_action} | "
            f"{'yes' if s.auto_resolvable else ''} | {'stretch' if s.stretch else 'yes'} |"
        )
    return "\n".join(lines) + "\n"


if __name__ == "__main__":  # pragma: no cover
    target = Path(sys.argv[sys.argv.index("--write") + 1]) if "--write" in sys.argv else None
    if target is None:
        sys.stdout.write(render_exceptions_md())
    else:
        target.write_text(render_exceptions_md(), encoding="utf-8")
