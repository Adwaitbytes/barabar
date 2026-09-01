from datetime import date

import pytest
from tests.factories import MonthBuilder

from barabar.core.calendar import ist
from barabar.core.config import MatchConfig
from barabar.core.exceptions import ExceptionType
from barabar.core.matching import (
    A1_UTR_EXACT,
    A4_RECEIPT_LEDGER,
    B1_BATCH_NET,
    B2_DECOMP,
    B4_MULTI_UTR,
    C1_UTR_PREFIX,
    reconcile,
)
from barabar.core.models import DisputeStatus, ExceptionStatus, SettlementStatus, SettlementType

CFG = MatchConfig()


def _exc_types(result) -> list[ExceptionType]:  # type: ignore[no-untyped-def]
    return sorted(e.type for e in result.exceptions)


def _rules(result) -> set[str]:  # type: ignore[no-untyped-def]
    return {link.rule_id for link in result.links}


def test_happy_path_no_exceptions() -> None:
    b = MonthBuilder()
    ps = [b.payment(100_000), b.payment(250_050, "upi"), b.payment(999, "netbanking")]
    s = b.settle(ps, on=date(2026, 8, 14))
    r = reconcile(b.build(), CFG, "run_1")
    assert r.exceptions == ()
    assert _rules(r) == {A1_UTR_EXACT, B1_BATCH_NET, B2_DECOMP, A4_RECEIPT_LEDGER}
    assert r.metrics["settlements_matched_to_bank"] == 1
    assert r.metrics["rupees_explained_pct"] == 100.0
    assert r.metrics["unexplained_paise"] == 0
    tree = r.proof_trees[s.settlement_id]
    assert tree.children[0].rule_id == A1_UTR_EXACT
    assert tree.children[-1].meta["residual"] == 0


def test_determinism_same_inputs_same_hash() -> None:
    b = MonthBuilder()
    b.settle([b.payment(100_000), b.payment(5_000, "upi")], on=date(2026, 8, 14))
    m = b.build()
    h1 = reconcile(m, CFG, "run_a").outputs_hash()
    h2 = reconcile(m, CFG, "run_b").outputs_hash()
    assert h1 == h2
    assert (
        reconcile(m, MatchConfig(tolerance_paise=5), "run_c").outputs_hash() == h1
    )  # no residuals, same


def test_split_across_two_utrs_links_both_and_auto_resolves() -> None:
    b = MonthBuilder()
    ps = [b.payment(1_000_000), b.payment(2_000_000)]
    s = b.settle(ps, on=date(2026, 8, 14), split=(1_500_000, ps[0].net + ps[1].net - 1_500_000))
    r = reconcile(b.build(), CFG, "run")
    b4 = [link for link in r.links if link.rule_id == B4_MULTI_UTR]
    assert len(b4) == 2 and sum(link.amount_matched for link in b4) == s.amount
    exc = [e for e in r.exceptions if e.type == ExceptionType.MULTI_UTR_SPLIT]
    assert len(exc) == 1 and exc[0].status == ExceptionStatus.AUTO_RESOLVED
    assert r.metrics["unexplained_paise"] == 0


def test_truncated_utr_becomes_proposal_not_match() -> None:
    b = MonthBuilder()
    ps = [b.payment(500_000)]
    # HDFC puts the UTR last; render full then cut 6 chars off the UTR
    s = b.settle(ps, on=date(2026, 8, 14), bank_credit=False)
    from barabar.core.models import TransferMode
    from barabar.core.narration import render_narration

    full = render_narration(b.bank, TransferMode.NEFT, s.utr or "", remarks="SETL")
    b.bank_credit(s.amount, date(2026, 8, 14), full[:-6])
    r = reconcile(b.build(), CFG, "run")
    assert A1_UTR_EXACT not in _rules(r)
    exc = [e for e in r.exceptions if e.type == ExceptionType.NARRATION_TRUNCATED_UTR]
    assert len(exc) == 1
    assert exc[0].status == ExceptionStatus.OPEN
    assert exc[0].candidate_link is not None and exc[0].candidate_link.rule_id == C1_UTR_PREFIX
    assert exc[0].confidence == pytest.approx(0.6)  # 10-char prefix
    assert exc[0].confidence < CFG.auto_accept_threshold
    assert r.metrics["unexplained_paise"] == s.amount


def test_duplicate_bank_credit_flagged_once() -> None:
    b = MonthBuilder()
    s = b.settle([b.payment(100_000)], on=date(2026, 8, 14), duplicate_credit=True)
    r = reconcile(b.build(), CFG, "run")
    assert r.metrics["settlements_matched_to_bank"] == 1
    dup = [e for e in r.exceptions if e.type == ExceptionType.DUPLICATE_BANK_CREDIT]
    assert len(dup) == 1 and dup[0].amount == s.amount


def test_missing_vs_bank_lag_depends_on_as_of() -> None:
    lag = MonthBuilder(as_of=date(2026, 8, 17))
    lag.settle([lag.payment(100_000)], on=date(2026, 8, 14), bank_credit=False)
    r = reconcile(lag.build(), CFG, "run")
    assert _exc_types(r) == [ExceptionType.TIMING_BANK_LAG]
    assert r.metrics["unexplained_paise"] == 0  # confidence 1.0: dated, explained

    late = MonthBuilder(as_of=date(2026, 9, 1))
    s = late.settle([late.payment(100_000)], on=date(2026, 8, 14), bank_credit=False)
    r2 = reconcile(late.build(), CFG, "run")
    assert _exc_types(r2) == [ExceptionType.MISSING_BANK_CREDIT]
    assert r2.metrics["unexplained_paise"] == s.amount


def test_fee_and_tax_variance() -> None:
    b = MonthBuilder()
    p = b.payment(100_000, fee=2_500, tax=450)  # 2.5% instead of 2%
    b.settle([p], on=date(2026, 8, 14))
    r = reconcile(b.build(), CFG, "run")
    fee = [e for e in r.exceptions if e.type == ExceptionType.FEE_VARIANCE]
    assert len(fee) == 1 and fee[0].amount == 500
    assert not [
        e for e in r.exceptions if e.type == ExceptionType.TAX_VARIANCE
    ]  # 18% of 2500 == 450


def test_upi_is_not_fee_variance() -> None:
    b = MonthBuilder()
    b.settle([b.payment(100_000, "upi")], on=date(2026, 8, 14))
    assert reconcile(b.build(), CFG, "run").exceptions == ()


def test_refund_netted_with_and_without_credit_note() -> None:
    b = MonthBuilder()
    p1, p2 = b.payment(100_000), b.payment(200_000)
    r1 = b.refund(p1, credit_note=True)
    r2 = b.refund(p2, amount=50_000, credit_note=False)
    b.settle([b.payment(300_000)], on=date(2026, 8, 18), refunds=[r1, r2])
    b.settle([p1, p2], on=date(2026, 8, 14))
    res = reconcile(b.build(), CFG, "run")
    netted = [e for e in res.exceptions if e.type == ExceptionType.REFUND_NETTED]
    assert len(netted) == 1 and netted[0].amount == 50_000 and r2.refund_id in netted[0].entities[1]


def test_refund_pending_net() -> None:
    b = MonthBuilder()
    p = b.payment(100_000)
    r = b.refund(p, on=date(2026, 8, 30))
    b.settle([p], on=date(2026, 8, 14))
    res = reconcile(b.build(), CFG, "run")
    pend = [e for e in res.exceptions if e.type == ExceptionType.REFUND_PENDING_NET]
    assert len(pend) == 1 and pend[0].amount == r.amount and pend[0].status == ExceptionStatus.OPEN


def test_dispute_debit_and_reversal_and_adjustments_and_hold_and_instant_fee() -> None:
    b = MonthBuilder()
    p1, p2, p3, held = b.payment(100_000), b.payment(100_000), b.payment(100_000), b.payment(40_000)
    d_lost = b.dispute(p1)
    d_won = b.dispute(p2, status=DisputeStatus.WON)
    b.settle([p1, p2], on=date(2026, 8, 14))
    b.settle(
        [p3],
        on=date(2026, 8, 18),
        disputes=[d_lost, d_won],
        adjustments=[(10_000, "manual credit")],
        on_hold=[held],
        instant_fee=1_500,
    )
    r = reconcile(b.build(), CFG, "run")
    types = _exc_types(r)
    for t in (
        ExceptionType.DISPUTE_DEBIT,
        ExceptionType.DISPUTE_REVERSAL,
        ExceptionType.ADJUSTMENT,
        ExceptionType.ON_HOLD,
        ExceptionType.INSTANT_SETTLEMENT_FEE,
    ):
        assert t in types, t
    assert r.metrics["settlements_matched_to_bank"] == 2  # batches still foot


def test_partial_settlement_with_continuation() -> None:
    b = MonthBuilder()
    p1, p2 = b.payment(1_000_000), b.payment(1_000_000)
    s1 = b.settle([p1], on=date(2026, 8, 14), type_=SettlementType.PARTIAL)
    b.settle([p2], on=date(2026, 8, 17), continuation_of=s1.settlement_id)
    r = reconcile(b.build(), CFG, "run")
    part = [e for e in r.exceptions if e.type == ExceptionType.PARTIAL_SETTLEMENT]
    assert len(part) == 1 and part[0].status == ExceptionStatus.AUTO_RESOLVED
    assert r.metrics["unexplained_paise"] == 0


def test_failed_settlement_retried() -> None:
    b = MonthBuilder()
    p = b.payment(100_000)
    failed = b.settle(
        [],
        on=date(2026, 8, 14),
        status=SettlementStatus.FAILED,
        amount_override=p.net,
        bank_credit=False,
    )
    b.settle([p], on=date(2026, 8, 18), retry_of=failed.settlement_id)
    r = reconcile(b.build(), CFG, "run")
    fr = [e for e in r.exceptions if e.type == ExceptionType.SETTLEMENT_FAILED_RETURNED]
    assert len(fr) == 1 and fr[0].status == ExceptionStatus.AUTO_RESOLVED
    assert r.metrics["settlements_matched_to_bank"] == 1
    assert r.metrics["unexplained_paise"] == 0


def test_ledger_orphan_mismatch_duplicate() -> None:
    b = MonthBuilder()
    p = b.payment(100_000, ledger_gross=105_000)  # shipping added in the ledger
    b.payment(50_000)
    b.settle(list(b.payments), on=date(2026, 8, 14))
    b.orphan_invoice(77_700, date(2026, 8, 10))  # COD, no payment
    dup_src = b.ledger[1]
    b.ledger.append(dup_src.model_copy(update={"ledger_id": "led_dup"}))
    r = reconcile(b.build(), CFG, "run")
    types = _exc_types(r)
    assert types.count(ExceptionType.AMOUNT_MISMATCH_LEDGER) == 1
    assert types.count(ExceptionType.ORPHAN_LEDGER_ENTRY) == 1
    assert types.count(ExceptionType.DUPLICATE_LEDGER_ENTRY) == 1
    mismatch = next(e for e in r.exceptions if e.type == ExceptionType.AMOUNT_MISMATCH_LEDGER)
    assert mismatch.amount == 5_000 and mismatch.candidate_link is not None
    assert p.payment_id in mismatch.entities[1]


def test_ledger_fuzzy_candidate_when_keys_missing() -> None:
    b = MonthBuilder()
    p = b.payment(123_400, ledger=False)
    b.settle([p], on=date(2026, 8, 14))
    b.orphan_invoice(123_400, date(2026, 8, 12))  # same amount, same day, no key
    r = reconcile(b.build(), CFG, "run")
    orphan = next(e for e in r.exceptions if e.type == ExceptionType.ORPHAN_LEDGER_ENTRY)
    assert orphan.candidate_link is not None and orphan.candidate_link.rule_id == "C3-LEDGER-FUZZY"
    assert orphan.confidence == pytest.approx(0.8)


def test_timing_not_yet_settled_and_overdue() -> None:
    b = MonthBuilder(as_of=date(2026, 8, 31))
    b.payment(100_000, captured=ist(2026, 8, 31, 12))  # due 2 Sep
    b.payment(100_000, captured=ist(2026, 8, 3, 12))  # due 5 Aug, never settled
    r = reconcile(b.build(), CFG, "run")
    exc = [e for e in r.exceptions if e.type == ExceptionType.TIMING_NOT_YET_SETTLED]
    assert len(exc) == 2
    fresh = next(e for e in exc if e.subtype is None)
    overdue = next(e for e in exc if e.subtype == "overdue")
    assert "2026-09-02" in fresh.reason_text and fresh.confidence == 1.0
    assert overdue.confidence == 0.5
    assert r.metrics["unexplained_paise"] == 100_000


def test_holiday_shift_is_flagged_and_auto_resolved() -> None:
    b = MonthBuilder()
    p = b.payment(
        100_000, captured=ist(2026, 8, 24, 12)
    )  # Mon; weekday-only T+2 = Wed 26 (Id-e-Milad) -> Thu 27
    b.settle([p], on=date(2026, 8, 27))
    r = reconcile(b.build(), CFG, "run")
    hs = [e for e in r.exceptions if e.type == ExceptionType.TIMING_HOLIDAY_SHIFT]
    assert len(hs) == 1 and hs[0].status == ExceptionStatus.AUTO_RESOLVED
    assert "2026-08-26" in hs[0].reason_text


def test_unknown_bank_credit() -> None:
    b = MonthBuilder()
    b.settle([b.payment(100_000)], on=date(2026, 8, 14))
    from barabar.core.models import TransferMode
    from barabar.core.narration import render_narration

    b.bank_credit(
        9_999, date(2026, 8, 20), render_narration(b.bank, TransferMode.NEFT, "HDFCN26232009999")
    )
    b.bank_credit(5_000, date(2026, 8, 20), "UPI/123456789012/coffee shop")
    r = reconcile(b.build(), CFG, "run")
    unk = [e for e in r.exceptions if e.type == ExceptionType.UNKNOWN_BANK_CREDIT]
    assert len(unk) == 1 and unk[0].amount == 9_999


def test_audit_chain_verifies_and_covers_every_link_and_exception() -> None:
    from barabar.core.audit import AuditChain

    b = MonthBuilder()
    b.settle([b.payment(100_000)], on=date(2026, 8, 14), duplicate_credit=True)
    r = reconcile(b.build(), CFG, "run")
    AuditChain.from_events(r.audit).verify()
    assert len(r.audit) == len(r.links) + len(r.exceptions)
