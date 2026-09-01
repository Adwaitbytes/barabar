"""Settlement Simulator: applies Razorpay's *documented* settlement rules to
Razorpay-shaped entities and emits settlements, recon lines, and a bank statement
in the merchant's bank layout. Test mode does not reliably generate settlements;
this is the bridge. ``docs/SIMULATED-VS-REAL.md`` lists exactly what is simulated.

Everything non-deterministic in the real world (a bank returning a transfer, a
manual adjustment, a truncated export) is an explicit *directive* in the plan, so
the generator can inject faults deliberately and record ground truth.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

from barabar.core.calendar import IST, SettlementCalendar, weekday_only_add
from barabar.core.exceptions import ExceptionType
from barabar.core.ids import IdGen
from barabar.core.models import (
    Bank,
    BankTxn,
    DisputeStatus,
    EntityKind,
    PaymentStatus,
    ReconLineType,
    RefundStatus,
    RzAdjustment,
    RzDispute,
    RzPayment,
    RzReconLine,
    RzRefund,
    RzSettlement,
    SettlementStatus,
    SettlementType,
    TransferMode,
    ref,
)
from barabar.core.money import apply_bps
from barabar.core.narration import parse_narration, render_narration
from barabar.core.utr import IFSC_BANK_CODES, make_neft_utr, make_rtgs_utr
from barabar.simulator.truth import TruthException, TruthLink

RTGS_MIN_PAISE = 200_000_00  # RTGS is for ₹2 lakh and above


@dataclass(frozen=True)
class SimulatorConfig:
    calendar: SettlementCalendar
    bank: Bank = Bank.HDFC
    remitter_bank_code: str = "HDFC"  # Razorpay's nodal account bank (IFSC prefix on UTRs)
    instant_settlement_fee_bps: int = 25
    bank_statement_end: date | None = None  # rows after this date are not in the export
    default_narration_max_len: int | None = None

    def config(self) -> dict[str, object]:
        return {
            "calendar": self.calendar.config(),
            "bank": self.bank.value,
            "remitter_bank_code": self.remitter_bank_code,
            "instant_settlement_fee_bps": self.instant_settlement_fee_bps,
            "bank_statement_end": self.bank_statement_end.isoformat()
            if self.bank_statement_end
            else None,
            "default_narration_max_len": self.default_narration_max_len,
        }


@dataclass
class BatchDirectives:
    partial_cap: int | None = None
    split_parts: int | None = None
    fail_and_retry_after_wd: int | None = None
    duplicate_bank_credit: bool = False
    missing_bank_credit: bool = False
    truncate_to: int | None = None
    truncate_utr_keep: int | None = None
    rounding_paise: int = 0
    adjustments: list[tuple[int, str]] = field(default_factory=list)


@dataclass
class SimulatorPlan:
    on_hold_payments: set[str] = field(default_factory=set)
    instant_payments: set[str] = field(default_factory=set)
    directives: dict[date, BatchDirectives] = field(default_factory=dict)
    extra_bank_credits: list[tuple[int, date, str]] = field(default_factory=list)
    credit_note_refunds: set[str] = field(default_factory=set)
    noise_rows: list[tuple[date, str, int, int]] = field(
        default_factory=list
    )  # (date, narration, credit, debit)


@dataclass
class SimOutput:
    settlements: list[RzSettlement]
    recon_lines: list[RzReconLine]
    adjustments: list[RzAdjustment]
    bank_txns: list[BankTxn]
    truth_links: list[TruthLink]
    truth_exceptions: list[TruthException]


def _at(d: date, hour: int, minute: int = 0) -> datetime:
    return datetime(d.year, d.month, d.day, hour, minute, tzinfo=IST).astimezone(UTC)


def _ist_date(dt: datetime) -> date:
    return dt.astimezone(IST).date()


class Simulator:
    def __init__(self, cfg: SimulatorConfig, plan: SimulatorPlan, ids: IdGen, as_of: date) -> None:
        self.cfg = cfg
        self.plan = plan
        self.ids = ids
        self.as_of = as_of
        self.cal = cfg.calendar
        self.out = SimOutput([], [], [], [], [], [])
        self._utr_seq = 100
        self._row = 0
        self._bank_rows: list[
            tuple[date, int, str, int, int]
        ] = []  # (date, order, narration, credit, debit)

    # --- helpers ---------------------------------------------------------------

    def _utr(self, on: date, amount: int) -> tuple[str, TransferMode]:
        self._utr_seq += 1
        if amount >= RTGS_MIN_PAISE:
            return make_rtgs_utr(self.cfg.remitter_bank_code, on, self._utr_seq), TransferMode.RTGS
        return make_neft_utr(self.cfg.remitter_bank_code, on, self._utr_seq), TransferMode.NEFT

    def _bank_row(self, on: date, narration: str, credit: int = 0, debit: int = 0) -> str | None:
        """Queue a statement row; returns the id it will get (None if beyond export end)."""
        if self.cfg.bank_statement_end and on > self.cfg.bank_statement_end:
            return None
        self._row += 1
        self._bank_rows.append((on, self._row, narration, credit, debit))
        return f"bank_{self._row:05d}"

    def _narration(self, mode: TransferMode, utr: str, d: BatchDirectives | None) -> str:
        full = render_narration(self.cfg.bank, mode, utr)
        if d and d.truncate_utr_keep is not None and full.endswith(utr):
            return full[: len(full) - len(utr) + d.truncate_utr_keep]
        cut = (d.truncate_to if d and d.truncate_to else None) or self.cfg.default_narration_max_len
        return full[:cut] if cut else full

    # --- line construction -----------------------------------------------------------

    def _payment_line(
        self, p: RzPayment, sid: str | None, settled_at: datetime | None, *, on_hold: bool = False
    ) -> RzReconLine:
        return RzReconLine(
            entity_id=p.payment_id,
            type=ReconLineType.PAYMENT,
            settlement_id=sid,
            debit=0,
            credit=p.net,
            amount=p.amount,
            fee=p.fee,
            tax=p.tax,
            currency=p.currency,
            on_hold=on_hold,
            settled=sid is not None and not on_hold,
            created_at=p.created_at,
            settled_at=settled_at,
            order_id=p.order_id,
            order_receipt=p.order_receipt,
            payment_id=p.payment_id,
            method=p.method,
            card_network=p.card_network,
            card_type=p.card_type,
            description="Payment",
        )

    def _refund_line(self, r: RzRefund, sid: str, settled_at: datetime) -> RzReconLine:
        return RzReconLine(
            entity_id=r.refund_id,
            type=ReconLineType.REFUND,
            settlement_id=sid,
            debit=r.amount,
            credit=0,
            amount=r.amount,
            fee=0,
            tax=0,
            settled=True,
            created_at=r.created_at,
            settled_at=settled_at,
            payment_id=r.payment_id,
            description="Refund",
        )

    def _dispute_line(self, d: RzDispute, sid: str, settled_at: datetime, won: bool) -> RzReconLine:
        return RzReconLine(
            entity_id=d.dispute_id,
            type=ReconLineType.ADJUSTMENT,
            settlement_id=sid,
            debit=0 if won else d.amount,
            credit=d.amount if won else 0,
            amount=d.amount,
            fee=0,
            tax=0,
            settled=True,
            created_at=d.created_at,
            settled_at=settled_at,
            payment_id=d.payment_id,
            dispute_id=d.dispute_id,
            description="Chargeback reversal" if won else "Chargeback",
        )

    def _adjustment_line(
        self, amount: int, reason: str, sid: str, settled_at: datetime
    ) -> RzReconLine:
        aid = self.ids.adjustment()
        self.out.adjustments.append(
            RzAdjustment(
                adjustment_id=aid,
                amount=amount,
                reason=reason,
                created_at=settled_at,
                settlement_id=sid,
            )
        )
        return RzReconLine(
            entity_id=aid,
            type=ReconLineType.ADJUSTMENT,
            settlement_id=sid,
            debit=-amount if amount < 0 else 0,
            credit=amount if amount > 0 else 0,
            amount=abs(amount),
            fee=0,
            tax=0,
            settled=True,
            created_at=settled_at,
            settled_at=settled_at,
            description=reason,
        )

    # --- main -------------------------------------------------------------------------

    def run(
        self, payments: list[RzPayment], refunds: list[RzRefund], disputes: list[RzDispute]
    ) -> SimOutput:
        pending_lines: dict[date, list[tuple[str, object]]] = defaultdict(
            list
        )  # day -> (kind, entity)

        # 1. payments -> batch days (or on-hold / instant / not yet due)
        for p in sorted(payments, key=lambda x: (x.captured_at or x.created_at, x.payment_id)):
            if (
                p.status not in (PaymentStatus.CAPTURED, PaymentStatus.REFUNDED)
                or not p.captured_at
            ):
                continue
            if p.payment_id in self.plan.on_hold_payments:
                self.out.recon_lines.append(self._payment_line(p, None, None, on_hold=True))
                self.out.truth_links.append(
                    TruthLink(
                        from_entity=ref(EntityKind.RECON_LINE, p.payment_id),
                        to_entity=ref(EntityKind.PAYMENT, p.payment_id),
                    )
                )
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.ON_HOLD,
                        primary_entity=ref(EntityKind.RECON_LINE, p.payment_id),
                        amount=p.amount,
                    )
                )
                continue
            if p.payment_id in self.plan.instant_payments:
                self._instant(p)
                continue
            due = self.cal.expected_settlement_date(p.captured_at)
            if due > self.as_of:
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.TIMING_NOT_YET_SETTLED,
                        primary_entity=ref(EntityKind.PAYMENT, p.payment_id),
                        amount=p.amount,
                    )
                )
                continue
            pending_lines[due].append(("payment", p))

        # 2. refunds net into the first batch after processing
        for r in sorted(refunds, key=lambda x: (x.processed_at or x.created_at, x.refund_id)):
            if r.status != RefundStatus.PROCESSED:
                continue
            day = self.cal.add_working_days(_ist_date(r.processed_at or r.created_at), 1)
            if day > self.as_of:
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.REFUND_PENDING_NET,
                        primary_entity=ref(EntityKind.REFUND, r.refund_id),
                        amount=r.amount,
                    )
                )
                continue
            pending_lines[day].append(("refund", r))

        # 3. disputes: debit on open, credit on win
        for d in sorted(disputes, key=lambda x: (x.created_at, x.dispute_id)):
            if d.status == DisputeStatus.WON and d.resolved_at:
                day = self.cal.add_working_days(_ist_date(d.resolved_at), 1)
                if day <= self.as_of:
                    pending_lines[day].append(("dispute_won", d))
            else:
                day = self.cal.add_working_days(_ist_date(d.created_at), 1)
                if day <= self.as_of:
                    pending_lines[day].append(("dispute", d))

        # 4. adjustments from directives
        for day, dirs in self.plan.directives.items():
            for amt, reason in dirs.adjustments:
                pending_lines[day].append(("adjustment", (amt, reason)))

        # 5. materialise batches in date order; a day whose net is not positive is
        #    carried forward (Razorpay carries a negative balance to the next settlement)
        carry: list[tuple[str, object]] = []
        days = sorted(pending_lines)
        for i, day in enumerate(days):
            items = carry + pending_lines[day]
            carry = []
            if self._net_of(items) <= 0:
                if i + 1 < len(days):
                    carry = items
                else:
                    self._never_settled(items)
                continue
            day_eff = self.cal.next_working_day(day)
            self._materialise(
                day_eff, items, self.plan.directives.get(day_eff) or self.plan.directives.get(day)
            )
        if carry:
            self._never_settled(carry)

        # 6. extra bank credits + noise
        for amount, on, narration in self.plan.extra_bank_credits:
            rid = self._bank_row(on, narration, credit=amount)
            if rid:
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.UNKNOWN_BANK_CREDIT,
                        primary_entity=ref(EntityKind.BANK, rid),
                        amount=amount,
                    )
                )
        for on, narration, credit, debit in self.plan.noise_rows:
            self._bank_row(on, narration, credit=credit, debit=debit)

        self._emit_bank_statement()
        return self.out

    @staticmethod
    def _net_of(items: list[tuple[str, object]]) -> int:
        net = 0
        for kind, ent in items:
            if kind == "payment":
                net += ent.net  # type: ignore[attr-defined]
            elif kind == "refund" or kind == "dispute":
                net -= ent.amount  # type: ignore[attr-defined]
            elif kind == "dispute_won":
                net += ent.amount  # type: ignore[attr-defined]
            elif kind == "adjustment":
                net += ent[0]  # type: ignore[index]
        return net

    def _never_settled(self, items: list[tuple[str, object]]) -> None:
        """Items that could not be netted this month: refunds stay pending, payments
        stay unsettled (both are timing facts the matcher must report)."""
        for kind, ent in items:
            if kind == "refund":
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.REFUND_PENDING_NET,
                        primary_entity=ref(EntityKind.REFUND, ent.refund_id),  # type: ignore[attr-defined]
                        amount=ent.amount,  # type: ignore[attr-defined]
                    )
                )
            elif kind == "payment":
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.TIMING_NOT_YET_SETTLED,
                        primary_entity=ref(EntityKind.PAYMENT, ent.payment_id),  # type: ignore[attr-defined]
                        amount=ent.amount,  # type: ignore[attr-defined]
                    )
                )

    def _instant(self, p: RzPayment) -> None:
        day = _ist_date(p.captured_at or p.created_at)
        fee = max(1, apply_bps(p.net, self.cfg.instant_settlement_fee_bps))
        sid = self.ids.settlement()
        settled_at = _at(day, 14)
        lines = [
            self._payment_line(p, sid, settled_at),
            self._adjustment_line(-fee, "Instant settlement fee", sid, settled_at),
        ]
        self.out.recon_lines.extend(lines)
        amount = p.net - fee
        utr, mode = self._utr(day, amount)
        s = RzSettlement(
            settlement_id=sid,
            amount=amount,
            fees=p.fee,
            tax=p.tax,
            utr=utr,
            status=SettlementStatus.PROCESSED,
            type=SettlementType.INSTANT,
            mode=mode,
            created_at=settled_at,
            settled_at=settled_at,
        )
        self.out.settlements.append(s)
        rid = self._bank_row(day, self._narration(mode, utr, None), credit=amount)
        self._truth_batch(s, lines, rid)
        self.out.truth_exceptions.append(
            TruthException(
                type=ExceptionType.INSTANT_SETTLEMENT_FEE,
                primary_entity=ref(EntityKind.RECON_LINE, lines[1].entity_id),
                amount=fee,
            )
        )

    def _materialise(
        self, day: date, items: list[tuple[str, object]], d: BatchDirectives | None
    ) -> None:
        d = d or BatchDirectives()
        sid = self.ids.settlement()
        settled_at = _at(day, 6, 12)
        lines: list[RzReconLine] = []
        shifted = False
        for kind, ent in items:
            if kind == "payment":
                p: RzPayment = ent  # type: ignore[assignment]
                lines.append(self._payment_line(p, sid, settled_at))
                if p.captured_at and not shifted:
                    naive = weekday_only_add(
                        self.cal.capture_day_ist(p.captured_at), self.cal.cycle_working_days
                    )
                    shifted = day > naive and any(naive <= h <= day for h in self.cal.holidays)
            elif kind == "refund":
                r: RzRefund = ent  # type: ignore[assignment]
                lines.append(self._refund_line(r, sid, settled_at))
                if r.refund_id not in self.plan.credit_note_refunds:
                    self.out.truth_exceptions.append(
                        TruthException(
                            type=ExceptionType.REFUND_NETTED,
                            primary_entity=ref(EntityKind.RECON_LINE, r.refund_id),
                            amount=r.amount,
                        )
                    )
            elif kind == "dispute":
                ln = self._dispute_line(ent, sid, settled_at, won=False)  # type: ignore[arg-type]
                lines.append(ln)
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.DISPUTE_DEBIT,
                        primary_entity=ref(EntityKind.RECON_LINE, ln.entity_id),
                        amount=ln.debit,
                    )
                )
            elif kind == "dispute_won":
                ln = self._dispute_line(ent, sid, settled_at, won=True)  # type: ignore[arg-type]
                lines.append(ln)
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.DISPUTE_REVERSAL,
                        primary_entity=ref(EntityKind.RECON_LINE, ln.entity_id),
                        amount=ln.credit,
                    )
                )
            elif kind == "adjustment":
                amt, reason = ent  # type: ignore[misc]
                ln = self._adjustment_line(amt, reason, sid, settled_at)
                lines.append(ln)
                self.out.truth_exceptions.append(
                    TruthException(
                        type=ExceptionType.ADJUSTMENT,
                        primary_entity=ref(EntityKind.RECON_LINE, ln.entity_id),
                        amount=abs(amt),
                    )
                )
        net = sum(ln.credit - ln.debit for ln in lines)

        # partial settlement: split lines across two batches
        continuation: list[RzReconLine] = []
        kind = SettlementType.STANDARD
        if d.partial_cap is not None and net > d.partial_cap:
            kept: list[RzReconLine] = []
            running = 0
            for ln in lines:
                delta = ln.credit - ln.debit
                if delta > 0 and running + delta > d.partial_cap:
                    continuation.append(ln)
                else:
                    kept.append(ln)
                    running += delta
            if not any(ln.type == ReconLineType.PAYMENT for ln in kept) and continuation:
                # a partial settlement is never empty: Razorpay pays out what balance allows
                first = continuation.pop(0)
                kept.append(first)
                running += first.credit - first.debit
            lines, net, kind = kept, running, SettlementType.PARTIAL

        amount = net - d.rounding_paise
        if d.rounding_paise:
            self.out.truth_exceptions.append(
                TruthException(
                    type=ExceptionType.ROUNDING,
                    primary_entity=ref(EntityKind.SETTLEMENT, sid),
                    amount=abs(d.rounding_paise),
                )
            )

        # failed-and-retried: the first attempt carries no lines and no credit
        if d.fail_and_retry_after_wd:
            failed = RzSettlement(
                settlement_id=sid,
                amount=amount,
                fees=0,
                tax=0,
                utr=self._utr(day, amount)[0],
                status=SettlementStatus.FAILED,
                type=kind,
                created_at=settled_at,
                settled_at=settled_at,
            )
            self.out.settlements.append(failed)
            self.out.truth_exceptions.append(
                TruthException(
                    type=ExceptionType.SETTLEMENT_FAILED_RETURNED,
                    primary_entity=ref(EntityKind.SETTLEMENT, sid),
                    amount=amount,
                )
            )
            retry_day = self.cal.add_working_days(day, d.fail_and_retry_after_wd)
            retry_sid = self.ids.settlement()
            retry_at = _at(retry_day, 6, 12)
            lines = [
                ln.model_copy(update={"settlement_id": retry_sid, "settled_at": retry_at})
                for ln in lines
            ]
            self.out.truth_links.append(
                TruthLink(
                    from_entity=ref(EntityKind.SETTLEMENT, sid),
                    to_entity=ref(EntityKind.SETTLEMENT, retry_sid),
                )
            )
            sid, settled_at, day = retry_sid, retry_at, retry_day

        self.out.recon_lines.extend(lines)
        utr, mode = self._utr(day, amount)
        s = RzSettlement(
            settlement_id=sid,
            amount=amount,
            fees=sum(ln.fee for ln in lines),
            tax=sum(ln.tax for ln in lines),
            utr=utr,
            status=SettlementStatus.PROCESSED,
            type=kind,
            mode=mode,
            created_at=settled_at,
            settled_at=settled_at,
            retry_of=None,
        )
        # the retry relationship is on the retry settlement
        if d.fail_and_retry_after_wd:
            s = s.model_copy(update={"retry_of": self.out.settlements[-1].settlement_id})
        self.out.settlements.append(s)

        if shifted:
            self.out.truth_exceptions.append(
                TruthException(
                    type=ExceptionType.TIMING_HOLIDAY_SHIFT,
                    primary_entity=ref(EntityKind.SETTLEMENT, sid),
                    amount=amount,
                )
            )

        # bank side
        bank_ids: list[str] = []
        if d.missing_bank_credit:
            self.out.truth_exceptions.append(
                TruthException(
                    type=ExceptionType.MISSING_BANK_CREDIT,
                    primary_entity=ref(EntityKind.SETTLEMENT, sid),
                    amount=amount,
                )
            )
        elif d.split_parts and d.split_parts > 1:
            first = amount * 55 // 100
            parts = (
                [first, amount - first]
                if d.split_parts == 2
                else [amount // d.split_parts] * (d.split_parts - 1)
                + [amount - (amount // d.split_parts) * (d.split_parts - 1)]
            )
            for i, part in enumerate(parts):
                u, m = (utr, mode) if i == 0 else self._utr(day, part)
                narr = self._narration(m, u, d)
                rid = self._bank_row(day, narr, credit=part)
                parsed = parse_narration(narr, self.cfg.bank)
                if rid and parsed and parsed.utr_full == u:
                    bank_ids.append(rid)
            self.out.truth_exceptions.append(
                TruthException(
                    type=ExceptionType.MULTI_UTR_SPLIT,
                    primary_entity=ref(EntityKind.SETTLEMENT, sid),
                    amount=amount,
                )
            )
        else:
            narration = self._narration(mode, utr, d)
            rid = self._bank_row(day, narration, credit=amount)
            if rid:
                parsed = parse_narration(narration, self.cfg.bank)
                if parsed and parsed.utr_full == utr:
                    bank_ids.append(rid)
                else:
                    self.out.truth_exceptions.append(
                        TruthException(
                            type=ExceptionType.NARRATION_TRUNCATED_UTR,
                            primary_entity=ref(EntityKind.SETTLEMENT, sid),
                            amount=amount,
                        )
                    )
                if d.duplicate_bank_credit:
                    dup = self._bank_row(day, narration, credit=amount)
                    if dup:
                        self.out.truth_exceptions.append(
                            TruthException(
                                type=ExceptionType.DUPLICATE_BANK_CREDIT,
                                primary_entity=ref(EntityKind.BANK, dup),
                                amount=amount,
                            )
                        )
            else:
                # beyond statement end: bank lag if within window, else missing
                deadline = self.cal.add_working_days(day, 1)
                etype = (
                    ExceptionType.TIMING_BANK_LAG
                    if self.as_of <= deadline
                    else ExceptionType.MISSING_BANK_CREDIT
                )
                self.out.truth_exceptions.append(
                    TruthException(
                        type=etype, primary_entity=ref(EntityKind.SETTLEMENT, sid), amount=amount
                    )
                )

        for rid in bank_ids:
            self.out.truth_links.append(
                TruthLink(
                    from_entity=ref(EntityKind.BANK, rid), to_entity=ref(EntityKind.SETTLEMENT, sid)
                )
            )
        self._truth_batch(s, lines, None)

        if continuation:
            cont_day = self.cal.add_working_days(day, 1)
            cont_sid = self.ids.settlement()
            cont_at = _at(cont_day, 6, 12)
            cont_lines = [
                ln.model_copy(update={"settlement_id": cont_sid, "settled_at": cont_at})
                for ln in continuation
            ]
            self.out.recon_lines.extend(cont_lines)
            cont_amount = sum(ln.credit - ln.debit for ln in cont_lines)
            cutr, cmode = self._utr(cont_day, cont_amount)
            cs = RzSettlement(
                settlement_id=cont_sid,
                amount=cont_amount,
                fees=sum(ln.fee for ln in cont_lines),
                tax=sum(ln.tax for ln in cont_lines),
                utr=cutr,
                status=SettlementStatus.PROCESSED,
                type=SettlementType.STANDARD,
                mode=cmode,
                created_at=cont_at,
                settled_at=cont_at,
                continuation_of=sid,
            )
            self.out.settlements.append(cs)
            rid = self._bank_row(cont_day, self._narration(cmode, cutr, None), credit=cont_amount)
            self._truth_batch(cs, cont_lines, rid)
            self.out.truth_links.append(
                TruthLink(
                    from_entity=ref(EntityKind.SETTLEMENT, sid),
                    to_entity=ref(EntityKind.SETTLEMENT, cont_sid),
                )
            )
            self.out.truth_exceptions.append(
                TruthException(
                    type=ExceptionType.PARTIAL_SETTLEMENT,
                    primary_entity=ref(EntityKind.SETTLEMENT, sid),
                    amount=cont_amount,
                )
            )

    def _truth_batch(self, s: RzSettlement, lines: list[RzReconLine], bank_row: str | None) -> None:
        sref = ref(EntityKind.SETTLEMENT, s.settlement_id)
        if bank_row:
            self.out.truth_links.append(
                TruthLink(from_entity=ref(EntityKind.BANK, bank_row), to_entity=sref)
            )
        for ln in lines:
            self.out.truth_links.append(
                TruthLink(from_entity=ref(EntityKind.RECON_LINE, ln.entity_id), to_entity=sref)
            )
            if ln.type == ReconLineType.PAYMENT and ln.payment_id:
                self.out.truth_links.append(
                    TruthLink(
                        from_entity=ref(EntityKind.RECON_LINE, ln.entity_id),
                        to_entity=ref(EntityKind.PAYMENT, ln.payment_id),
                    )
                )
            elif ln.type == ReconLineType.REFUND and ln.payment_id:
                self.out.truth_links.append(
                    TruthLink(
                        from_entity=ref(EntityKind.REFUND, ln.entity_id),
                        to_entity=ref(EntityKind.PAYMENT, ln.payment_id),
                    )
                )

    def _emit_bank_statement(self) -> None:
        """Rows are numbered in statement order (by date), and every truth entity that
        referenced a queue-time id is remapped, so a CSV round trip is id-stable."""
        balance = 5_000_000_00  # opening ₹50L
        id_map: dict[str, str] = {}
        for i, (on, order, narration, credit, debit) in enumerate(
            sorted(self._bank_rows, key=lambda r: (r[0], r[1])), start=1
        ):
            id_map[f"bank_{order:05d}"] = f"bank_{i:05d}"
            balance += credit - debit
            self.out.bank_txns.append(
                BankTxn(
                    bank_txn_id=f"bank_{i:05d}",
                    bank=self.cfg.bank,
                    value_date=on,
                    posted_date=on,
                    narration_raw=narration,
                    narration=parse_narration(narration, self.cfg.bank),
                    credit=credit,
                    debit=debit,
                    balance_after=balance,
                    source_file="statement.csv",
                    row_no=i,
                )
            )

        def remap(entity: str) -> str:
            kind, _, ident = entity.partition(":")
            return f"{kind}:{id_map.get(ident, ident)}" if kind == "bank" else entity

        self.out.truth_links = [
            TruthLink(from_entity=remap(link.from_entity), to_entity=remap(link.to_entity))
            for link in self.out.truth_links
        ]
        self.out.truth_exceptions = [
            x.model_copy(update={"primary_entity": remap(x.primary_entity)})
            for x in self.out.truth_exceptions
        ]


def bank_code_for(bank: Bank) -> str:
    return IFSC_BANK_CODES.get(bank.value, "HDFC")
