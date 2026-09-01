"""Synthetic month generator: a believable month for a merchant profile, with the
faults you chose, plus ground truth for every link and exception."""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Final

from barabar.core.calendar import IST, SettlementCalendar
from barabar.core.exceptions import ExceptionType
from barabar.core.ids import IdGen
from barabar.core.models import (
    Bank,
    DisputePhase,
    DisputeStatus,
    EntityKind,
    LedgerEntry,
    LedgerStatus,
    Month,
    PaymentStatus,
    RefundSpeed,
    RefundStatus,
    RzDispute,
    RzPayment,
    RzRefund,
    TransferMode,
    ref,
)
from barabar.core.money import apply_bps
from barabar.core.narration import render_narration
from barabar.core.ratecard import RateCard
from barabar.core.utr import make_neft_utr
from barabar.generator.faults import FaultPlan
from barabar.generator.profiles import PROFILES, MerchantProfile
from barabar.simulator.engine import BatchDirectives, Simulator, SimulatorConfig, SimulatorPlan
from barabar.simulator.truth import GroundTruth, TruthException, TruthLink

SHIPPING_ADDONS: Final = (49_00, 99_00, 149_00)


@dataclass(frozen=True)
class GeneratedMonth:
    month: Month
    truth: GroundTruth
    config: dict[str, object]


def _weighted(rng: random.Random, weights: dict[str, float]) -> str:
    keys = list(weights)
    return rng.choices(keys, weights=[weights[k] for k in keys], k=1)[0]


def generate(
    seed: int = 42,
    profile: MerchantProfile = MerchantProfile.D2C_FASHION,
    n_orders: int = 600,
    faults: FaultPlan | None = None,
    *,
    year: int = 2026,
    month: int = 8,
    as_of: date | None = None,
    bank: Bank = Bank.HDFC,
    rate_card: RateCard | None = None,
    calendar: SettlementCalendar | None = None,
) -> GeneratedMonth:
    faults = faults or FaultPlan()
    rc = rate_card or RateCard()
    cal = calendar or SettlementCalendar.rbi(year)
    spec = PROFILES[profile]
    rng = random.Random(f"barabar-gen-{seed}-{profile}-{n_orders}")
    ids = IdGen(seed)

    first = date(year, month, 1)
    last = date(year + (month // 12), month % 12 + 1, 1) - timedelta(days=1)
    as_of = as_of or last + timedelta(days=1)
    statement_end = as_of - timedelta(days=1)  # the export is pulled on the morning of as_of

    # --- payments -------------------------------------------------------------------
    payments: list[RzPayment] = []
    n_days = (last - first).days + 1
    for i in range(n_orders):
        day = first + timedelta(days=rng.randrange(n_days))
        captured = datetime(
            day.year,
            day.month,
            day.day,
            rng.randrange(8, 24),
            rng.randrange(60),
            rng.randrange(60),
            tzinfo=IST,
        )
        rupees = int(rng.lognormvariate(_ln(spec.median_rupees), spec.sigma))
        rupees = max(spec.min_rupees, min(spec.max_rupees, rupees))
        amount = rupees * 100 + (rng.randrange(1, 100) if rng.random() < spec.paise_share else 0)
        method = _weighted(rng, spec.method_weights)
        network = _weighted(rng, spec.card_networks) if method == "card" else None
        ctype = _weighted(rng, spec.card_types) if method == "card" else None
        fb = rc.decompose(amount, method, card_network=network, card_type=ctype)
        payments.append(
            RzPayment(
                payment_id=ids.payment(),
                order_id=ids.order(),
                order_receipt=f"rcpt_{year}{month:02d}_{i + 1:05d}",
                amount=amount,
                fee=fb.fee,
                tax=fb.tax,
                method=method,
                card_network=network,
                card_type=ctype,
                captured_at=captured.astimezone(UTC),
                created_at=(captured - timedelta(seconds=45)).astimezone(UTC),
                status=PaymentStatus.CAPTURED,
            )
        )
    payments.sort(key=lambda p: (p.captured_at or p.created_at, p.payment_id))
    truth_exc: list[TruthException] = []
    truth_links: list[TruthLink] = []

    # fee / tax variance (custom rate on one method; one tax line off by a few paise)
    settle_by = last - timedelta(days=6)
    card_payments = [
        p
        for p in payments
        if p.method == "card"
        and p.fee > 0
        and p.captured_at
        and p.captured_at.astimezone(IST).date() <= settle_by
    ]
    for p in rng.sample(
        card_payments, min(faults.count(faults.fee_variance_rate, n_orders), len(card_payments))
    ):
        fee = apply_bps(p.amount, 180)  # negotiated 1.8% the rate card does not know about
        payments[payments.index(p)] = p.model_copy(update={"fee": fee, "tax": rc.expected_tax(fee)})
        truth_exc.append(
            TruthException(
                type=ExceptionType.FEE_VARIANCE,
                primary_entity=ref(EntityKind.RECON_LINE, p.payment_id),
                amount=abs(fee - p.fee),
            )
        )
    remaining = [
        p
        for p in card_payments
        if not any(t.primary_entity.endswith(p.payment_id) for t in truth_exc)
    ]
    for p in rng.sample(remaining, min(faults.tax_variance, len(remaining))):
        payments[payments.index(p)] = p.model_copy(update={"tax": p.tax + 7})
        truth_exc.append(
            TruthException(
                type=ExceptionType.TAX_VARIANCE,
                primary_entity=ref(EntityKind.RECON_LINE, p.payment_id),
                amount=7,
            )
        )
    by_id = {p.payment_id: p for p in payments}

    # --- refunds ----------------------------------------------------------------------
    refunds: list[RzRefund] = []
    early = [
        p
        for p in payments
        if p.captured_at and p.captured_at.astimezone(IST).date() <= last - timedelta(days=6)
    ]
    n_ref = faults.count(faults.refund_rate, n_orders)
    for j, p in enumerate(rng.sample(early, min(n_ref, len(early)))):
        partial = j % 2 == 1 if faults.refund_partial_share > 0 else False
        amount = apply_bps(p.amount, 4000) if partial else p.amount
        created = (p.captured_at or p.created_at) + timedelta(days=rng.randrange(1, 5), hours=2)
        refunds.append(
            RzRefund(
                refund_id=ids.refund(),
                payment_id=p.payment_id,
                amount=amount,
                created_at=created,
                processed_at=created + timedelta(hours=3),
                status=RefundStatus.PROCESSED,
                speed=RefundSpeed.NORMAL,
            )
        )
    for _ in range(faults.pending_refunds):
        cands = [p for p in payments if p.payment_id not in {r.payment_id for r in refunds}]
        p = rng.choice(cands)
        created = datetime(as_of.year, as_of.month, as_of.day, 9, 0, tzinfo=IST).astimezone(UTC)
        refunds.append(
            RzRefund(
                refund_id=ids.refund(),
                payment_id=p.payment_id,
                amount=p.amount,
                created_at=created,
                processed_at=created + timedelta(hours=1),
                status=RefundStatus.PROCESSED,
            )
        )
    credit_note_refunds = {r.refund_id for r in refunds if rng.random() < faults.credit_note_share}

    # --- disputes -----------------------------------------------------------------------
    disputes: list[RzDispute] = []
    n_disp = faults.count(faults.dispute_rate, n_orders) if faults.dispute_rate > 0 else 0
    disp_pool = [p for p in early if p.payment_id not in {r.payment_id for r in refunds}]
    for j, p in enumerate(rng.sample(disp_pool, min(n_disp, len(disp_pool)))):
        opened = (p.captured_at or p.created_at) + timedelta(days=rng.randrange(2, 6))
        won = j % 2 == 1
        disputes.append(
            RzDispute(
                dispute_id=ids.dispute(),
                payment_id=p.payment_id,
                amount=p.amount,
                phase=DisputePhase.CHARGEBACK,
                status=DisputeStatus.WON if won else DisputeStatus.OPEN,
                respond_by=opened + timedelta(days=14),
                created_at=opened,
                resolved_at=opened + timedelta(days=5) if won else None,
            )
        )

    # --- ledger -------------------------------------------------------------------------
    ledger: list[LedgerEntry] = []
    inv = 0
    mismatch_ids = {
        p.payment_id
        for p in rng.sample(
            payments, min(faults.count(faults.ledger_mismatch_rate, n_orders), n_orders)
        )
    }
    for p in payments:
        inv += 1
        by_payment_ref = rng.random() < 0.15
        gross = p.amount
        if p.payment_id in mismatch_ids:
            gross += rng.choice(SHIPPING_ADDONS)
        entry = LedgerEntry(
            ledger_id=f"led_{inv:05d}",
            invoice_no=f"INV/{year % 100}-{year % 100 + 1}/{inv:05d}",
            customer_ref=f"cust_{rng.randrange(1, 400):04d}",
            order_receipt=None if by_payment_ref else p.order_receipt,
            payment_ref=p.payment_id if by_payment_ref else None,
            date=(p.captured_at or p.created_at).astimezone(IST).date(),
            gross=gross,
            status=LedgerStatus.PAID,
            source="synthetic",
        )
        ledger.append(entry)
        if p.payment_id in mismatch_ids:
            truth_exc.append(
                TruthException(
                    type=ExceptionType.AMOUNT_MISMATCH_LEDGER,
                    primary_entity=ref(EntityKind.LEDGER, entry.ledger_id),
                    amount=gross - p.amount,
                )
            )
        else:
            truth_links.append(
                TruthLink(
                    from_entity=ref(EntityKind.LEDGER, entry.ledger_id),
                    to_entity=ref(EntityKind.PAYMENT, p.payment_id),
                )
            )
    for r in refunds:
        if r.refund_id in credit_note_refunds:
            inv += 1
            note = LedgerEntry(
                ledger_id=f"led_{inv:05d}",
                invoice_no=f"CN/{year % 100}-{year % 100 + 1}/{inv:05d}",
                payment_ref=r.refund_id,
                date=(r.processed_at or r.created_at).astimezone(IST).date(),
                gross=-r.amount,
                status=LedgerStatus.PAID,
                source="synthetic",
            )
            ledger.append(note)
    for _ in range(faults.count(faults.orphan_ledger_rate, n_orders)):
        inv += 1
        entry = LedgerEntry(
            ledger_id=f"led_{inv:05d}",
            invoice_no=f"INV/{year % 100}-{year % 100 + 1}/{inv:05d}",
            customer_ref=f"cust_{rng.randrange(1, 400):04d}",
            date=first + timedelta(days=rng.randrange(n_days)),
            gross=rng.randrange(spec.min_rupees, spec.max_rupees // 4) * 100,
            status=LedgerStatus.PAID,
            source="synthetic",
            notes="COD",
        )
        ledger.append(entry)
        truth_exc.append(
            TruthException(
                type=ExceptionType.ORPHAN_LEDGER_ENTRY,
                primary_entity=ref(EntityKind.LEDGER, entry.ledger_id),
                amount=entry.gross,
            )
        )
    dup_pool = [
        e
        for e in ledger
        if e.gross > 0 and e.ledger_id not in {t.primary_entity.split(":")[1] for t in truth_exc}
    ]
    for src in rng.sample(dup_pool, min(faults.duplicate_ledger, len(dup_pool))):
        inv += 1
        dup = src.model_copy(update={"ledger_id": f"led_{inv:05d}"})
        ledger.append(dup)
        truth_exc.append(
            TruthException(
                type=ExceptionType.DUPLICATE_LEDGER_ENTRY,
                primary_entity=ref(EntityKind.LEDGER, dup.ledger_id),
                amount=dup.gross,
            )
        )

    # --- settlement plan -------------------------------------------------------------------
    due_days = sorted(
        {cal.expected_settlement_date(p.captured_at) for p in payments if p.captured_at}
    )
    due_days = [d for d in due_days if d <= as_of]
    eligible = [
        d for d in due_days if cal.add_working_days(d, 1) < as_of and d >= first + timedelta(days=4)
    ]
    rng.shuffle(eligible)
    plan = SimulatorPlan(credit_note_refunds=credit_note_refunds)
    net_by_day: dict[date, int] = {}
    for p in payments:
        if p.captured_at:
            d = cal.expected_settlement_date(p.captured_at)
            net_by_day[d] = net_by_day.get(d, 0) + p.net

    def take() -> date | None:
        return eligible.pop() if eligible else None

    for _ in range(faults.partial_settlements):
        if (d := take()) is not None:
            plan.directives[d] = BatchDirectives(partial_cap=net_by_day.get(d, 0) * 6 // 10)
    for _ in range(faults.split_settlements):
        if (d := take()) is not None:
            plan.directives[d] = BatchDirectives(split_parts=2)
    for _ in range(faults.failed_retried):
        if (d := take()) is not None:
            plan.directives[d] = BatchDirectives(fail_and_retry_after_wd=2)
    for _ in range(faults.duplicate_bank_credits):
        if (d := take()) is not None:
            plan.directives[d] = BatchDirectives(duplicate_bank_credit=True)
    for _ in range(faults.missing_bank_credits):
        if eligible:
            d = min(
                eligible, key=lambda x: net_by_day.get(x, 0)
            )  # a small batch: honest, not theatrical
            eligible.remove(d)
            plan.directives[d] = BatchDirectives(missing_bank_credit=True)
    for _ in range(faults.rounding_batches):
        if (d := take()) is not None:
            plan.directives[d] = BatchDirectives(rounding_paise=3)
    n_trunc = faults.count(faults.truncation_rate, len(due_days))
    for k in range(n_trunc):
        if (d := take()) is not None:
            plan.directives[d] = (
                BatchDirectives(truncate_utr_keep=faults.demo_truncation_keep)
                if k == 0
                else BatchDirectives(truncate_to=faults.truncation_len)
            )
    adj_reasons = [
        (10_000_00, "Manual credit: promo reimbursement"),
        (-2_500_00, "Manual debit: excess settlement recovery"),
        (1_234_00, "Manual credit: fee waiver"),
    ]
    for k in range(faults.adjustments):
        if (d := take()) is not None:
            plan.directives[d] = BatchDirectives(adjustments=[adj_reasons[k % len(adj_reasons)]])
    mid = [
        p
        for p in payments
        if p.captured_at
        and first + timedelta(days=8)
        <= p.captured_at.astimezone(IST).date()
        <= last - timedelta(days=8)
    ]
    hold = rng.sample(mid, min(faults.on_hold, len(mid)))
    plan.on_hold_payments = {p.payment_id for p in hold}
    inst = rng.sample(
        [p for p in mid if p not in hold],
        min(faults.instant_settlements, max(0, len(mid) - len(hold))),
    )
    plan.instant_payments = {p.payment_id for p in inst}
    for k in range(faults.unknown_bank_credits):
        on = first + timedelta(days=10 + k)
        utr = make_neft_utr("ICIC", on, 990_000 + k)
        plan.extra_bank_credits.append(
            (
                12_345_67 + k * 100,
                on,
                render_narration(
                    bank,
                    TransferMode.NEFT,
                    utr,
                    counterparty="RAZORPAY SOFTWARE PVT LTD",
                    remarks="REFUND REVERSAL",
                ),
            )
        )
    plan.noise_rows = [
        (
            first + timedelta(days=2),
            "NEFT DR-UTIB0000012-OFFICE RENT AUG-ACME REALTY",
            0,
            85_000_00,
        ),
        (
            first + timedelta(days=6),
            "UPI/522212345678/CUSTOMER PAYMENT/9876543210@okhdfc",
            2_499_00,
            0,
        ),
        (last - timedelta(days=2), "SALARY AUG 2026", 0, 6_40_000_00),
    ]

    sim = Simulator(
        SimulatorConfig(calendar=cal, bank=bank, bank_statement_end=statement_end),
        plan,
        ids,
        as_of,
    )
    out = sim.run(payments, refunds, disputes)
    truth_exc.extend(out.truth_exceptions)
    truth_links.extend(out.truth_links)
    for r in refunds:
        if r.refund_id in credit_note_refunds:
            note = next(e for e in ledger if e.payment_ref == r.refund_id)
            truth_links.append(
                TruthLink(
                    from_entity=ref(EntityKind.LEDGER, note.ledger_id),
                    to_entity=ref(EntityKind.REFUND, r.refund_id),
                )
            )

    payments_final = [by_id.get(p.payment_id, p) for p in payments]
    month_obj = Month(
        as_of=as_of,
        payments=tuple(payments_final),
        refunds=tuple(refunds),
        disputes=tuple(disputes),
        adjustments=tuple(out.adjustments),
        settlements=tuple(out.settlements),
        recon_lines=tuple(out.recon_lines),
        bank_txns=tuple(out.bank_txns),
        ledger=tuple(ledger),
    )
    truth = GroundTruth(
        seed=seed,
        profile=profile.value,
        n_orders=n_orders,
        fault_plan=faults.as_dict(),
        gross_captured=month_obj.gross_captured,
        links=tuple(truth_links),
        exceptions=tuple(truth_exc),
    )
    config: dict[str, object] = {
        "seed": seed,
        "profile": profile.value,
        "n_orders": n_orders,
        "year": year,
        "month": month,
        "as_of": as_of.isoformat(),
        "bank": bank.value,
        "faults": faults.as_dict(),
        "simulator": sim.cfg.config(),
    }
    return GeneratedMonth(month=month_obj, truth=truth, config=config)


def _ln(x: float) -> float:
    import math

    return math.log(x)
