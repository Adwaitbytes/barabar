"""The matcher: three deterministic tiers plus typed exception classification.

No LLM is imported here, on purpose. Every link and exception carries the rule
ID that produced it; the same ``Month`` and ``MatchConfig`` always produce the
same links, exceptions and ``outputs_hash``.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from itertools import combinations

from rapidfuzz import fuzz

from barabar.core.audit import AuditChain
from barabar.core.calendar import IST, weekday_only_add
from barabar.core.config import MatchConfig
from barabar.core.exceptions import EXCEPTION_SPECS, ExceptionType
from barabar.core.hashing import content_hash
from barabar.core.models import (
    BankTxn,
    EntityKind,
    Evidence,
    ExceptionItem,
    ExceptionStatus,
    LedgerEntry,
    MatchLink,
    Month,
    NarrationParsed,
    PaymentStatus,
    ReconLineType,
    RefundStatus,
    RzPayment,
    RzReconLine,
    RzRefund,
    RzSettlement,
    SettlementStatus,
    SettlementType,
    Tier,
    ref,
)
from barabar.core.narration import RAZORPAY_COUNTERPARTY, parse_narration
from barabar.core.proof import build_proof_trees
from barabar.core.result import ReconResult
from barabar.core.utr import utr_prefix_match

# --- rule ids ---------------------------------------------------------------

A1_UTR_EXACT = "A1-UTR-EXACT"
A2_SETL_ID = "A2-SETTLEMENT-ID-IN-NARRATION"
A3_PAYMENT_ID_LEDGER = "A3-PAYMENT-ID-LEDGER"
A4_RECEIPT_LEDGER = "A4-RECEIPT-LEDGER"
B1_BATCH_NET = "B1-BATCH-NET"
B2_DECOMP = "B2-GROSS-FEE-TAX-DECOMP"
B3_REFUND_NET = "B3-REFUND-NET"
B4_MULTI_UTR = "B4-MULTI-UTR-SPLIT"
B5_PARTIAL = "B5-PARTIAL-CONTINUATION"
B6_CALENDAR = "B6-CALENDAR-RESHIFT"
B7_RETRY = "B7-FAILED-RETRY-CHAIN"
C1_UTR_PREFIX = "C1-UTR-PREFIX"
C2_AMOUNT_DATE_NARR = "C2-AMOUNT-DATE-NARRATION"
C3_LEDGER_FUZZY = "C3-LEDGER-FUZZY"

RULE_CONFIDENCE: dict[str, float] = {
    A1_UTR_EXACT: 1.0,
    A2_SETL_ID: 1.0,
    A3_PAYMENT_ID_LEDGER: 1.0,
    A4_RECEIPT_LEDGER: 1.0,
    B1_BATCH_NET: 0.98,
    B2_DECOMP: 0.98,
    B3_REFUND_NET: 0.97,
    B4_MULTI_UTR: 0.9,
    B5_PARTIAL: 0.9,
    B6_CALENDAR: 0.95,
    B7_RETRY: 0.95,
}

# How sure we are of the *explanation* an exception offers. Below the
# auto-accept threshold the rupees stay "unexplained" until a human resolves.
EXCEPTION_CONFIDENCE: dict[ExceptionType, float] = {
    ExceptionType.TIMING_NOT_YET_SETTLED: 1.0,
    ExceptionType.TIMING_BANK_LAG: 1.0,
    ExceptionType.TIMING_HOLIDAY_SHIFT: 1.0,
    ExceptionType.FEE_VARIANCE: 0.6,
    ExceptionType.TAX_VARIANCE: 0.6,
    ExceptionType.ROUNDING: 1.0,
    ExceptionType.REFUND_NETTED: 1.0,
    ExceptionType.REFUND_PENDING_NET: 1.0,
    ExceptionType.DISPUTE_DEBIT: 1.0,
    ExceptionType.DISPUTE_REVERSAL: 1.0,
    ExceptionType.ADJUSTMENT: 0.8,
    ExceptionType.ON_HOLD: 1.0,
    ExceptionType.PARTIAL_SETTLEMENT: 1.0,
    ExceptionType.INSTANT_SETTLEMENT_FEE: 1.0,
    ExceptionType.MULTI_UTR_SPLIT: 1.0,
    ExceptionType.MISSING_BANK_CREDIT: 0.5,
    ExceptionType.UNKNOWN_BANK_CREDIT: 0.3,
    ExceptionType.DUPLICATE_BANK_CREDIT: 0.95,
    ExceptionType.NARRATION_TRUNCATED_UTR: 0.7,
    ExceptionType.SETTLEMENT_FAILED_RETURNED: 1.0,
    ExceptionType.ORPHAN_LEDGER_ENTRY: 0.4,
    ExceptionType.AMOUNT_MISMATCH_LEDGER: 0.6,
    ExceptionType.DUPLICATE_LEDGER_ENTRY: 0.95,
    ExceptionType.INTL_FX: 0.8,
    ExceptionType.MARKETPLACE_TDS_TCS: 0.9,
}

INSTANT_FEE_MARKER = "instant settlement"


def _ist_date(dt: datetime | None) -> date | None:
    return dt.astimezone(IST).date() if dt else None


@dataclass
class _Ctx:
    month: Month
    cfg: MatchConfig
    run_id: str
    clock: datetime
    links: list[MatchLink] = field(default_factory=list)
    exceptions: list[ExceptionItem] = field(default_factory=list)
    audit: AuditChain = field(default_factory=AuditChain)
    # indices
    settlements: dict[str, RzSettlement] = field(default_factory=dict)
    payments: dict[str, RzPayment] = field(default_factory=dict)
    payments_by_receipt: dict[str, RzPayment] = field(default_factory=dict)
    refunds: dict[str, RzRefund] = field(default_factory=dict)
    lines_by_setl: dict[str, list[RzReconLine]] = field(default_factory=lambda: defaultdict(list))
    lines_by_payment: dict[str, list[RzReconLine]] = field(
        default_factory=lambda: defaultdict(list)
    )
    refund_lines: dict[str, RzReconLine] = field(default_factory=dict)
    narr: dict[str, NarrationParsed | None] = field(default_factory=dict)
    credits: list[BankTxn] = field(default_factory=list)
    consumed_bank: set[str] = field(default_factory=set)
    proposed_bank: set[str] = field(default_factory=set)
    matched_setl: set[str] = field(default_factory=set)
    ledger_by_payment_ref: dict[str, list[LedgerEntry]] = field(
        default_factory=lambda: defaultdict(list)
    )
    ledger_by_receipt: dict[str, list[LedgerEntry]] = field(
        default_factory=lambda: defaultdict(list)
    )
    credit_notes_by_refund: dict[str, LedgerEntry] = field(default_factory=dict)
    ledger_matched_payments: set[str] = field(default_factory=set)

    # --- emitters ------------------------------------------------------------

    def link(
        self,
        from_entity: str,
        to_entity: str,
        tier: Tier,
        rule_id: str,
        amount: int,
        *,
        confidence: float | None = None,
        residual: int = 0,
    ) -> MatchLink:
        conf = RULE_CONFIDENCE[rule_id] if confidence is None else confidence
        link = MatchLink(
            link_id="lnk_" + content_hash([from_entity, to_entity, rule_id])[:16],
            run_id=self.run_id,
            from_entity=from_entity,
            to_entity=to_entity,
            tier=tier,
            rule_id=rule_id,
            confidence=conf,
            amount_matched=amount,
            residual=residual,
            created_at=self.clock,
        )
        self.links.append(link)
        self.audit.append(
            actor="system",
            action="match.link",
            target=f"{from_entity}->{to_entity}",
            rule_or_evidence=rule_id,
            run_id=self.run_id,
            ts=self.clock,
        )
        return link

    def exc(
        self,
        etype: ExceptionType,
        entities: list[str],
        amount: int,
        reason: str,
        *,
        confidence: float | None = None,
        status: ExceptionStatus = ExceptionStatus.OPEN,
        candidate: MatchLink | None = None,
        secondary: tuple[ExceptionType, ...] = (),
        evidence: tuple[Evidence, ...] = (),
        subtype: str | None = None,
    ) -> ExceptionItem:
        spec = EXCEPTION_SPECS[etype]
        conf = EXCEPTION_CONFIDENCE[etype] if confidence is None else confidence
        item = ExceptionItem(
            exc_id="exc_" + content_hash([etype.value, entities])[:16],
            run_id=self.run_id,
            type=etype,
            subtype=subtype,
            secondary_tags=secondary,
            amount=abs(amount),
            entities=tuple(entities),
            confidence=conf,
            reason_code=etype.value,
            reason_text=reason,
            suggested_action=spec.suggested_action,
            status=status,
            evidence=evidence,
            candidate_link=candidate,
        )
        self.exceptions.append(item)
        self.audit.append(
            actor="system",
            action=f"exception.{status.value}",
            target=item.exc_id,
            rule_or_evidence=f"{etype.value}: {reason}",
            run_id=self.run_id,
            ts=self.clock,
        )
        return item

    def candidate(
        self, from_entity: str, to_entity: str, rule_id: str, amount: int, conf: float
    ) -> MatchLink:
        return MatchLink(
            link_id="cand_" + content_hash([from_entity, to_entity, rule_id])[:16],
            run_id=self.run_id,
            from_entity=from_entity,
            to_entity=to_entity,
            tier=Tier.C,
            rule_id=rule_id,
            confidence=conf,
            amount_matched=amount,
            created_at=self.clock,
        )

    # --- helpers -------------------------------------------------------------

    def narration(self, txn: BankTxn) -> NarrationParsed | None:
        if txn.bank_txn_id not in self.narr:
            self.narr[txn.bank_txn_id] = txn.narration or parse_narration(
                txn.narration_raw, txn.bank
            )
        return self.narr[txn.bank_txn_id]

    def wd_distance(self, a: date, b: date) -> int:
        return abs(self.cfg.calendar.working_days_between(a, b))

    def free_credits(self) -> list[BankTxn]:
        return [c for c in self.credits if c.bank_txn_id not in self.consumed_bank]


# --- indexing ---------------------------------------------------------------


def _index(ctx: _Ctx) -> None:
    m = ctx.month
    ctx.settlements = {s.settlement_id: s for s in m.settlements}
    ctx.payments = {p.payment_id: p for p in m.payments}
    ctx.payments_by_receipt = {p.order_receipt: p for p in m.payments if p.order_receipt}
    ctx.refunds = {r.refund_id: r for r in m.refunds}
    for line in sorted(m.recon_lines, key=lambda x: (x.settlement_id or "", x.entity_id)):
        if line.settlement_id:
            ctx.lines_by_setl[line.settlement_id].append(line)
        if line.type == ReconLineType.PAYMENT:
            ctx.lines_by_payment[line.payment_id or line.entity_id].append(line)
        elif line.type == ReconLineType.REFUND:
            ctx.refund_lines[line.entity_id] = line
    ctx.credits = sorted(
        (t for t in m.bank_txns if t.credit > 0),
        key=lambda t: (t.value_date, t.row_no, t.bank_txn_id),
    )
    for entry in m.ledger:
        if entry.gross < 0 and entry.payment_ref and entry.payment_ref.startswith("rfnd_"):
            ctx.credit_notes_by_refund[entry.payment_ref] = entry
        elif entry.payment_ref:
            ctx.ledger_by_payment_ref[entry.payment_ref].append(entry)
        if entry.order_receipt and entry.gross >= 0:
            ctx.ledger_by_receipt[entry.order_receipt].append(entry)


# --- step 1: dedupe bank credits ----------------------------------------------


def _dedupe_bank(ctx: _Ctx) -> None:
    seen: dict[str, BankTxn] = {}
    for txn in ctx.credits:
        parsed = ctx.narration(txn)
        if not parsed or not parsed.utr_full:
            continue
        first = seen.get(parsed.utr_full)
        if first is None:
            seen[parsed.utr_full] = txn
            continue
        ctx.consumed_bank.add(txn.bank_txn_id)
        ctx.exc(
            ExceptionType.DUPLICATE_BANK_CREDIT,
            [ref(EntityKind.BANK, txn.bank_txn_id), ref(EntityKind.BANK, first.bank_txn_id)],
            txn.credit,
            f"UTR {parsed.utr_full} credited twice (rows {first.row_no} and {txn.row_no})",
        )


# --- step 2: settlement <-> bank credit ------------------------------------


def _settled_date(s: RzSettlement) -> date:
    d = _ist_date(s.settled_at) or _ist_date(s.created_at)
    assert d is not None
    return d


def _try_exact(ctx: _Ctx, s: RzSettlement, sref: str) -> bool:
    for txn in ctx.free_credits():
        parsed = ctx.narration(txn)
        if not parsed or txn.credit != s.amount:
            continue
        rule = None
        if s.utr and parsed.utr_full == s.utr:
            rule = A1_UTR_EXACT
        elif parsed.settlement_id_hint == s.settlement_id:
            rule = A2_SETL_ID
        if rule:
            ctx.link(ref(EntityKind.BANK, txn.bank_txn_id), sref, Tier.A, rule, s.amount)
            ctx.consumed_bank.add(txn.bank_txn_id)
            ctx.matched_setl.add(s.settlement_id)
            return True
    return False


def _try_split(ctx: _Ctx, s: RzSettlement, sref: str) -> bool:
    sd = _settled_date(s)
    pool = [
        t
        for t in ctx.free_credits()
        if (ctx.narration(t) and ctx.narration(t).razorpay_like)  # type: ignore[union-attr]
        and t.credit < s.amount
        and ctx.wd_distance(sd, t.value_date) <= 1
    ]
    for k in range(2, min(ctx.cfg.max_split_credits, len(pool)) + 1):
        for combo in combinations(pool, k):
            if sum(t.credit for t in combo) == s.amount:
                for t in combo:
                    ctx.link(
                        ref(EntityKind.BANK, t.bank_txn_id), sref, Tier.B, B4_MULTI_UTR, t.credit
                    )
                    ctx.consumed_bank.add(t.bank_txn_id)
                ctx.matched_setl.add(s.settlement_id)
                ctx.exc(
                    ExceptionType.MULTI_UTR_SPLIT,
                    [sref, *(ref(EntityKind.BANK, t.bank_txn_id) for t in combo)],
                    s.amount,
                    f"settlement arrived as {k} bank credits summing to the batch net",
                    status=ExceptionStatus.AUTO_RESOLVED,
                )
                return True
    return False


def _try_calendar_reshift(ctx: _Ctx, s: RzSettlement, sref: str) -> bool:
    """Exact amount, Razorpay narration with no UTR at all, landing on the settled
    day or its calendar-shifted successor — and unique."""
    sd = _settled_date(s)
    expected = {sd, ctx.cfg.calendar.next_working_day(sd), ctx.cfg.calendar.add_working_days(sd, 1)}
    cands = [
        t
        for t in ctx.free_credits()
        if t.credit == s.amount
        and t.value_date in expected
        and (p := ctx.narration(t)) is not None
        and p.razorpay_like
        and p.utr_full is None
        and p.utr_prefix is None
    ]
    if len(cands) != 1:
        return False
    t = cands[0]
    ctx.link(ref(EntityKind.BANK, t.bank_txn_id), sref, Tier.B, B6_CALENDAR, s.amount)
    ctx.consumed_bank.add(t.bank_txn_id)
    ctx.matched_setl.add(s.settlement_id)
    if t.value_date != sd:
        ctx.exc(
            ExceptionType.TIMING_HOLIDAY_SHIFT,
            [sref, ref(EntityKind.BANK, t.bank_txn_id)],
            s.amount,
            f"credit expected {sd.isoformat()} landed {t.value_date.isoformat()} (closure in between)",
            status=ExceptionStatus.AUTO_RESOLVED,
        )
    return True


def _try_tier_c(ctx: _Ctx, s: RzSettlement, sref: str) -> bool:
    sd = _settled_date(s)
    best: tuple[float, str, BankTxn, str] | None = None  # (score, rule, txn, why)
    for t in ctx.free_credits():
        if (
            t.credit != s.amount
            or ctx.wd_distance(sd, t.value_date) > ctx.cfg.date_window_working_days
        ):
            continue
        p = ctx.narration(t)
        if p is None:
            continue
        if s.utr and p.utr_prefix:
            n = utr_prefix_match(s.utr, p.utr_prefix, ctx.cfg.prefix_min_len)
            if n:
                score = min(0.6 + 0.04 * (n - ctx.cfg.prefix_min_len), ctx.cfg.tier_c_cap)
                why = f"UTR prefix {p.utr_prefix} ({n} chars) + exact amount + date within window"
                if best is None or score > best[0]:
                    best = (score, C1_UTR_PREFIX, t, why)
                continue
        sim = fuzz.token_set_ratio(t.narration_raw.upper(), RAZORPAY_COUNTERPARTY)
        if sim >= ctx.cfg.razorpay_similarity_min:
            score = min(0.5 + 0.0035 * sim, ctx.cfg.tier_c_cap)
            why = f"exact amount + date within window + narration similarity {sim:.0f}"
            if best is None or score > best[0]:
                best = (score, C2_AMOUNT_DATE_NARR, t, why)
    if best is None:
        return False
    score, rule, t, why = best
    bref = ref(EntityKind.BANK, t.bank_txn_id)
    if score >= ctx.cfg.auto_accept_threshold:
        ctx.link(bref, sref, Tier.C, rule, s.amount, confidence=score)
        ctx.consumed_bank.add(t.bank_txn_id)
        ctx.matched_setl.add(s.settlement_id)
        return True
    cand = ctx.candidate(bref, sref, rule, s.amount, score)
    p = ctx.narration(t)
    etype = (
        ExceptionType.NARRATION_TRUNCATED_UTR
        if (p and (p.utr_prefix or p.utr_full is None))
        else ExceptionType.MISSING_BANK_CREDIT
    )
    ctx.proposed_bank.add(t.bank_txn_id)
    ctx.exc(etype, [sref, bref], s.amount, why, confidence=score, candidate=cand)
    return True


def _match_settlements_to_bank(ctx: _Ctx) -> None:
    cal = ctx.cfg.calendar
    ordered = sorted(ctx.settlements.values(), key=lambda s: (_settled_date(s), s.settlement_id))
    for s in ordered:
        sref = ref(EntityKind.SETTLEMENT, s.settlement_id)
        if s.status == SettlementStatus.FAILED:
            retry = next((r for r in ordered if r.retry_of == s.settlement_id), None)
            if retry:
                ctx.link(
                    sref,
                    ref(EntityKind.SETTLEMENT, retry.settlement_id),
                    Tier.B,
                    B7_RETRY,
                    s.amount,
                )
                ctx.exc(
                    ExceptionType.SETTLEMENT_FAILED_RETURNED,
                    [sref, ref(EntityKind.SETTLEMENT, retry.settlement_id)],
                    s.amount,
                    f"bank returned {s.settlement_id}; re-credited via {retry.settlement_id}",
                    status=ExceptionStatus.AUTO_RESOLVED,
                )
            else:
                ctx.exc(
                    ExceptionType.SETTLEMENT_FAILED_RETURNED,
                    [sref],
                    s.amount,
                    "bank returned the settlement; no retry seen yet",
                )
            continue
        if s.status != SettlementStatus.PROCESSED:
            ctx.exc(
                ExceptionType.TIMING_BANK_LAG,
                [sref],
                s.amount,
                "settlement created but not yet processed by Razorpay",
            )
            continue
        if (
            _try_exact(ctx, s, sref)
            or _try_split(ctx, s, sref)
            or _try_calendar_reshift(ctx, s, sref)
            or _try_tier_c(ctx, s, sref)
        ):
            pass
        else:
            sd = _settled_date(s)
            deadline = cal.add_working_days(sd, ctx.cfg.bank_lag_working_days)
            if ctx.month.as_of <= deadline:
                ctx.exc(
                    ExceptionType.TIMING_BANK_LAG,
                    [sref],
                    s.amount,
                    f"processed {sd.isoformat()}; bank credit expected by {deadline.isoformat()}",
                )
            else:
                ctx.exc(
                    ExceptionType.MISSING_BANK_CREDIT,
                    [sref],
                    s.amount,
                    f"processed {sd.isoformat()}, no bank credit by {ctx.month.as_of.isoformat()}",
                )
        if s.type == SettlementType.PARTIAL:
            cont = next((c for c in ordered if c.continuation_of == s.settlement_id), None)
            if cont:
                ctx.link(
                    sref,
                    ref(EntityKind.SETTLEMENT, cont.settlement_id),
                    Tier.B,
                    B5_PARTIAL,
                    cont.amount,
                )
                ctx.exc(
                    ExceptionType.PARTIAL_SETTLEMENT,
                    [sref, ref(EntityKind.SETTLEMENT, cont.settlement_id)],
                    cont.amount,
                    f"partial settlement; remainder settled in {cont.settlement_id}",
                    status=ExceptionStatus.AUTO_RESOLVED,
                )
            else:
                ctx.exc(
                    ExceptionType.PARTIAL_SETTLEMENT,
                    [sref],
                    s.amount,
                    "partial settlement; continuation batch not seen yet",
                )
    # leftovers on the bank side
    for t in ctx.free_credits():
        if t.bank_txn_id in ctx.proposed_bank:
            continue
        p = ctx.narration(t)
        if p and p.razorpay_like:
            ctx.exc(
                ExceptionType.UNKNOWN_BANK_CREDIT,
                [ref(EntityKind.BANK, t.bank_txn_id)],
                t.credit,
                f"Razorpay-like credit on {t.value_date.isoformat()} matches no settlement",
            )


# --- step 3: settlement <-> recon lines (B1) + line-level exceptions ----------


def _holiday_shift(ctx: _Ctx, s: RzSettlement, lines: list[RzReconLine]) -> None:
    """Flag batches whose date moved because a holiday sat inside the T+2 window."""
    cal = ctx.cfg.calendar
    sd = _settled_date(s)
    for line in lines:
        if line.type != ReconLineType.PAYMENT:
            continue
        p = ctx.payments.get(line.payment_id or line.entity_id)
        if not p or not p.captured_at:
            continue
        t0 = cal.capture_day_ist(p.captured_at)
        weekday_only = weekday_only_add(t0, cal.cycle_working_days)
        holidays_hit = [d for d in cal.holidays if weekday_only <= d <= sd]
        if holidays_hit and sd > weekday_only:
            ctx.exc(
                ExceptionType.TIMING_HOLIDAY_SHIFT,
                [ref(EntityKind.SETTLEMENT, s.settlement_id)],
                s.amount,
                f"batch expected {weekday_only.isoformat()} shifted to {sd.isoformat()} by holiday {holidays_hit[0].isoformat()}",
                status=ExceptionStatus.AUTO_RESOLVED,
            )
            return


def _match_lines_to_settlements(ctx: _Ctx) -> None:
    for sid in sorted(ctx.lines_by_setl):
        s = ctx.settlements.get(sid)
        if s is None:
            continue
        sref = ref(EntityKind.SETTLEMENT, sid)
        lines = [ln for ln in ctx.lines_by_setl[sid] if ln.settled and not ln.on_hold]
        net = sum(ln.credit - ln.debit for ln in lines)
        residual = s.amount - net
        for ln in lines:
            ctx.link(
                ref(EntityKind.RECON_LINE, ln.entity_id),
                sref,
                Tier.B,
                B1_BATCH_NET,
                ln.credit - ln.debit,
            )
        if abs(residual) > ctx.cfg.tolerance_paise:
            if abs(residual) <= ctx.cfg.rounding_batch_paise:
                ctx.exc(
                    ExceptionType.ROUNDING,
                    [sref],
                    residual,
                    f"batch net differs from settlement by {residual} paise",
                    status=ExceptionStatus.AUTO_RESOLVED,
                )
            elif residual < 0:
                ctx.exc(
                    ExceptionType.PARTIAL_SETTLEMENT,
                    [sref],
                    residual,
                    f"lines net {net} exceeds settled {s.amount}",
                )
            else:
                ctx.exc(
                    ExceptionType.ADJUSTMENT,
                    [sref],
                    residual,
                    f"settled {s.amount} exceeds lines net {net}; unexplained credit",
                )
        _holiday_shift(ctx, s, lines)
    # line-level exceptions across all lines (including on-hold / unsettled)
    for ln in sorted(ctx.month.recon_lines, key=lambda x: x.entity_id):
        lref = ref(EntityKind.RECON_LINE, ln.entity_id)
        setl_refs = [ref(EntityKind.SETTLEMENT, ln.settlement_id)] if ln.settlement_id else []
        if ln.on_hold:
            ctx.exc(
                ExceptionType.ON_HOLD,
                [lref, *setl_refs],
                ln.amount,
                "line held by Razorpay; expect a later batch",
            )
        if ln.type == ReconLineType.REFUND:
            _refund_line(ctx, ln, lref, setl_refs)
        elif ln.dispute_id:
            if ln.debit:
                ctx.exc(
                    ExceptionType.DISPUTE_DEBIT,
                    [lref, ref(EntityKind.DISPUTE, ln.dispute_id), *setl_refs],
                    ln.debit,
                    f"chargeback {ln.dispute_id} debited in batch",
                )
            elif ln.credit:
                ctx.exc(
                    ExceptionType.DISPUTE_REVERSAL,
                    [lref, ref(EntityKind.DISPUTE, ln.dispute_id), *setl_refs],
                    ln.credit,
                    f"dispute {ln.dispute_id} won; amount re-credited",
                )
        elif ln.type == ReconLineType.ADJUSTMENT:
            if INSTANT_FEE_MARKER in (ln.description or "").lower():
                ctx.exc(
                    ExceptionType.INSTANT_SETTLEMENT_FEE,
                    [lref, *setl_refs],
                    ln.debit,
                    ln.description or "instant settlement fee",
                )
            else:
                ctx.exc(
                    ExceptionType.ADJUSTMENT,
                    [lref, *setl_refs],
                    ln.credit - ln.debit,
                    f"Razorpay adjustment: {ln.description or 'no reason given'}",
                )


def _refund_line(ctx: _Ctx, ln: RzReconLine, lref: str, setl_refs: list[str]) -> None:
    refund = ctx.refunds.get(ln.entity_id)
    if refund:
        ctx.link(
            ref(EntityKind.REFUND, refund.refund_id),
            ref(EntityKind.PAYMENT, refund.payment_id),
            Tier.B,
            B3_REFUND_NET,
            refund.amount,
        )
    note = ctx.credit_notes_by_refund.get(ln.entity_id)
    if note:
        ctx.link(
            ref(EntityKind.LEDGER, note.ledger_id),
            ref(EntityKind.REFUND, ln.entity_id),
            Tier.B,
            B3_REFUND_NET,
            -note.gross,
        )
    else:
        ctx.exc(
            ExceptionType.REFUND_NETTED,
            [lref, ref(EntityKind.REFUND, ln.entity_id), *setl_refs],
            ln.debit,
            f"refund {ln.entity_id} netted in batch; ledger has no credit note",
        )


# --- step 4: recon lines <-> payments (B2) ---------------------------------


def _match_lines_to_payments(ctx: _Ctx) -> None:
    cal = ctx.cfg.calendar
    rc = ctx.cfg.rate_card
    pending: dict[date, list[RzPayment]] = {}
    for pid in sorted(ctx.payments):
        p = ctx.payments[pid]
        pref = ref(EntityKind.PAYMENT, pid)
        lines = ctx.lines_by_payment.get(pid, [])
        for ln in lines:
            lref = ref(EntityKind.RECON_LINE, ln.entity_id)
            ctx.link(lref, pref, Tier.B, B2_DECOMP, ln.amount, residual=ln.amount - p.amount)
            expected_fee = rc.expected_fee(
                p.amount,
                p.method,
                card_network=p.card_network,
                card_type=p.card_type,
                international=p.international,
            )
            fee_diff = ln.fee - expected_fee
            if abs(fee_diff) > ctx.cfg.rounding_line_paise:
                ctx.exc(
                    ExceptionType.FEE_VARIANCE,
                    [lref, pref],
                    fee_diff,
                    f"fee {ln.fee} vs rate-card {expected_fee} ({rc.rate_key(p.method, card_network=p.card_network, card_type=p.card_type, international=p.international)} @ {rc.rate_bps(p.method, card_network=p.card_network, card_type=p.card_type, international=p.international)} bps)",
                )
            tax_diff = ln.tax - rc.expected_tax(ln.fee)
            if abs(tax_diff) > ctx.cfg.rounding_line_paise:
                ctx.exc(
                    ExceptionType.TAX_VARIANCE,
                    [lref, pref],
                    tax_diff,
                    f"tax {ln.tax} vs 18% of fee {rc.expected_tax(ln.fee)}",
                )
        if (
            not lines
            and p.status in (PaymentStatus.CAPTURED, PaymentStatus.REFUNDED)
            and p.captured_at
        ):
            expected = cal.expected_settlement_date(p.captured_at)
            if expected > ctx.month.as_of:
                pending.setdefault(expected, []).append(p)
            else:
                overdue = cal.working_days_between(expected, ctx.month.as_of)
                ctx.exc(
                    ExceptionType.TIMING_NOT_YET_SETTLED,
                    [pref],
                    p.amount,
                    f"settlement was due {expected.isoformat()}; overdue by {overdue} working day(s) - raise with Razorpay",
                    confidence=0.5,
                    subtype="overdue",
                )
    # one exception per due date, not one per payment: "14 payments due 2 Sep" is the fact
    for expected in sorted(pending):
        group = pending[expected]
        days = [cal.capture_day_ist(p.captured_at) for p in group if p.captured_at]
        ctx.exc(
            ExceptionType.TIMING_NOT_YET_SETTLED,
            [ref(EntityKind.PAYMENT, p.payment_id) for p in group],
            sum(p.amount for p in group),
            f"{len(group)} payment(s) captured {min(days).isoformat()}..{max(days).isoformat()}; settlement due {expected.isoformat()}",
        )


# --- step 5: refunds without lines ---------------------------------------------


def _refunds_pending(ctx: _Ctx) -> None:
    for rid in sorted(ctx.refunds):
        r = ctx.refunds[rid]
        if r.status == RefundStatus.PROCESSED and rid not in ctx.refund_lines:
            ctx.exc(
                ExceptionType.REFUND_PENDING_NET,
                [ref(EntityKind.REFUND, rid), ref(EntityKind.PAYMENT, r.payment_id)],
                r.amount,
                f"refund processed {(_ist_date(r.processed_at) or _ist_date(r.created_at)).isoformat()}; not yet netted in a batch",  # type: ignore[union-attr]
            )


# --- step 6: ledger <-> payments -------------------------------------------------


def _match_ledger(ctx: _Ctx) -> None:
    seen: dict[tuple[str, int, date], LedgerEntry] = {}
    for entry in sorted(ctx.month.ledger, key=lambda e: (e.date, e.invoice_no, e.ledger_id)):
        lref = ref(EntityKind.LEDGER, entry.ledger_id)
        if entry.gross < 0 or entry.status.value == "cancelled":
            continue
        key = (entry.invoice_no, entry.gross, entry.date)
        if key in seen:
            ctx.exc(
                ExceptionType.DUPLICATE_LEDGER_ENTRY,
                [lref, ref(EntityKind.LEDGER, seen[key].ledger_id)],
                entry.gross,
                f"invoice {entry.invoice_no} appears twice",
            )
            continue
        seen[key] = entry
        p: RzPayment | None = None
        rule = None
        if entry.payment_ref and entry.payment_ref in ctx.payments:
            p, rule = ctx.payments[entry.payment_ref], A3_PAYMENT_ID_LEDGER
        elif entry.order_receipt and entry.order_receipt in ctx.payments_by_receipt:
            p, rule = ctx.payments_by_receipt[entry.order_receipt], A4_RECEIPT_LEDGER
        if p and rule:
            pref = ref(EntityKind.PAYMENT, p.payment_id)
            if entry.gross == p.amount:
                ctx.link(lref, pref, Tier.A, rule, entry.gross)
                ctx.ledger_matched_payments.add(p.payment_id)
            else:
                diff = p.amount - entry.gross
                cand = ctx.candidate(lref, pref, rule, min(entry.gross, p.amount), 0.6)
                ctx.exc(
                    ExceptionType.AMOUNT_MISMATCH_LEDGER,
                    [lref, pref],
                    diff,
                    f"invoice {entry.gross} vs payment {p.amount} (diff {diff})",
                    candidate=cand,
                )
            continue
        _ledger_fuzzy(ctx, entry, lref)


def _ledger_fuzzy(ctx: _Ctx, entry: LedgerEntry, lref: str) -> None:
    best: tuple[float, RzPayment] | None = None
    for pid in sorted(ctx.payments):
        p = ctx.payments[pid]
        if pid in ctx.ledger_matched_payments or not p.captured_at:
            continue
        amt_diff = abs(p.amount - entry.gross)
        day_diff = abs((_ist_date(p.captured_at) - entry.date).days)  # type: ignore[operator]
        if amt_diff > ctx.cfg.ledger_tolerance_paise or day_diff > ctx.cfg.ledger_date_window_days:
            continue
        score = 0.55 + (0.15 if amt_diff == 0 else 0.0) + (0.10 if day_diff == 0 else 0.0)
        score = min(score, ctx.cfg.tier_c_ledger_cap)
        if best is None or score > best[0]:
            best = (score, p)
    if best:
        score, p = best
        pref = ref(EntityKind.PAYMENT, p.payment_id)
        cand = ctx.candidate(lref, pref, C3_LEDGER_FUZZY, entry.gross, score)
        ctx.exc(
            ExceptionType.ORPHAN_LEDGER_ENTRY,
            [lref, pref],
            entry.gross,
            f"no key match; candidate payment {p.payment_id} within tolerance",
            confidence=score,
            candidate=cand,
        )
    else:
        ctx.exc(
            ExceptionType.ORPHAN_LEDGER_ENTRY,
            [lref],
            entry.gross,
            f"invoice {entry.invoice_no} has no Razorpay payment (COD / other gateway / manual?)",
        )


# --- metrics -----------------------------------------------------------------------


LEDGER_TYPES: frozenset[ExceptionType] = frozenset(
    {
        ExceptionType.ORPHAN_LEDGER_ENTRY,
        ExceptionType.AMOUNT_MISMATCH_LEDGER,
        ExceptionType.DUPLICATE_LEDGER_ENTRY,
        ExceptionType.REFUND_NETTED,
    }
)
"""Ledger-side hygiene: these do not change how much Razorpay money is explained,
they change what the books say about it. Reported as ``ledger_open_paise``."""


def _metrics(ctx: _Ctx) -> dict[str, float | int | str]:
    m = ctx.month
    gross = m.gross_captured
    low_conf_open = [
        e
        for e in ctx.exceptions
        if e.status == ExceptionStatus.OPEN and e.confidence < ctx.cfg.auto_accept_threshold
    ]
    unexplained = min(sum(e.amount for e in low_conf_open if e.type not in LEDGER_TYPES), gross)
    ledger_open = sum(
        e.amount
        for e in ctx.exceptions
        if e.status == ExceptionStatus.OPEN and e.type in LEDGER_TYPES
    )
    by_tier = {t.value: sum(1 for link in ctx.links if link.tier == t) for t in Tier}
    processed = [s for s in ctx.settlements.values() if s.status == SettlementStatus.PROCESSED]
    return {
        "gross_captured_paise": gross,
        "payments": len(m.payments),
        "settlements": len(m.settlements),
        "settlements_processed": len(processed),
        "settlements_matched_to_bank": len(ctx.matched_setl),
        "bank_credits": len(ctx.credits),
        "ledger_entries": len(m.ledger),
        "links_total": len(ctx.links),
        **{f"links_tier_{k}": v for k, v in by_tier.items()},
        "exceptions_total": len(ctx.exceptions),
        "exceptions_open": sum(1 for e in ctx.exceptions if e.status == ExceptionStatus.OPEN),
        "exceptions_auto_resolved": sum(
            1 for e in ctx.exceptions if e.status == ExceptionStatus.AUTO_RESOLVED
        ),
        "unexplained_paise": unexplained,
        "explained_paise": gross - unexplained,
        "rupees_explained_pct": round(100.0 * (gross - unexplained) / gross, 4) if gross else 100.0,
        "ledger_open_paise": ledger_open,
        "payments_with_ledger_match": len(ctx.ledger_matched_payments),
    }


# --- entry point -------------------------------------------------------------------


def reconcile(
    month: Month, cfg: MatchConfig, run_id: str, clock: datetime | None = None
) -> ReconResult:
    ctx = _Ctx(month=month, cfg=cfg, run_id=run_id, clock=clock or datetime(2000, 1, 1, tzinfo=UTC))
    _index(ctx)
    _dedupe_bank(ctx)
    _match_settlements_to_bank(ctx)
    _match_lines_to_settlements(ctx)
    _match_lines_to_payments(ctx)
    _refunds_pending(ctx)
    _match_ledger(ctx)
    trees = build_proof_trees(month, ctx.links, ctx.exceptions)
    return ReconResult(
        run_id=run_id,
        as_of=month.as_of,
        links=tuple(ctx.links),
        exceptions=tuple(ctx.exceptions),
        proof_trees=trees,
        metrics=_metrics(ctx),
        audit=tuple(ctx.audit.events),
    )
