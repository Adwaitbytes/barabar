"""Self-consistent month builder for matcher tests. Everything it emits obeys the
same rules the simulator will: recon credits are net of fee+tax, batches foot,
narrations render per bank, UTRs are well-formed."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from barabar.core.calendar import IST, SettlementCalendar, ist
from barabar.core.ids import IdGen
from barabar.core.models import (
    Bank,
    BankTxn,
    DisputePhase,
    DisputeStatus,
    LedgerEntry,
    LedgerStatus,
    Month,
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
)
from barabar.core.narration import parse_narration, render_narration
from barabar.core.ratecard import RateCard
from barabar.core.utr import IFSC_BANK_CODES, make_imps_rrn, make_neft_utr, make_rtgs_utr


def at(d: date, hour: int = 6) -> datetime:
    return datetime(d.year, d.month, d.day, hour, 0, tzinfo=IST).astimezone(UTC)


class MonthBuilder:
    def __init__(
        self, as_of: date = date(2026, 9, 1), bank: Bank = Bank.HDFC, seed: int = 1
    ) -> None:
        self.as_of = as_of
        self.bank = bank
        self.ids = IdGen(seed)
        self.cal = SettlementCalendar.rbi(2026)
        self.rc = RateCard()
        self.payments: list[RzPayment] = []
        self.refunds: list[RzRefund] = []
        self.disputes: list[RzDispute] = []
        self.adjustments: list[RzAdjustment] = []
        self.settlements: list[RzSettlement] = []
        self.lines: list[RzReconLine] = []
        self.bank_txns: list[BankTxn] = []
        self.ledger: list[LedgerEntry] = []
        self._seq = 4000
        self._row = 0
        self._inv = 1000

    # --- razorpay side ---------------------------------------------------------

    def payment(
        self,
        amount: int,
        method: str = "card",
        captured: datetime | None = None,
        *,
        fee: int | None = None,
        tax: int | None = None,
        ledger: bool = True,
        ledger_gross: int | None = None,
        ledger_key: str = "receipt",
        card_network: str | None = None,
        card_type: str | None = None,
    ) -> RzPayment:
        captured = captured or ist(2026, 8, 12, 10)
        fb = self.rc.decompose(amount, method, card_network=card_network, card_type=card_type)
        receipt = f"rcpt_{len(self.payments) + 1:05d}"
        p = RzPayment(
            payment_id=self.ids.payment(),
            order_id=self.ids.order(),
            order_receipt=receipt,
            amount=amount,
            fee=fb.fee if fee is None else fee,
            tax=fb.tax if tax is None else tax,
            method=method,
            card_network=card_network,
            card_type=card_type,
            captured_at=captured.astimezone(UTC),
            created_at=(captured - timedelta(minutes=1)).astimezone(UTC),
            status=PaymentStatus.CAPTURED,
        )
        self.payments.append(p)
        if ledger:
            self.invoice(p, gross=ledger_gross, key=ledger_key)
        return p

    def invoice(
        self, p: RzPayment, *, gross: int | None = None, key: str = "receipt"
    ) -> LedgerEntry:
        self._inv += 1
        e = LedgerEntry(
            ledger_id=f"led_{self._inv}",
            invoice_no=f"INV/26-27/{self._inv}",
            customer_ref=f"cust_{self._inv}",
            order_receipt=p.order_receipt if key == "receipt" else None,
            payment_ref=p.payment_id if key == "payment" else None,
            date=p.captured_at.astimezone(IST).date() if p.captured_at else date(2026, 8, 1),
            gross=p.amount if gross is None else gross,
            status=LedgerStatus.PAID,
            source="synthetic",
        )
        self.ledger.append(e)
        return e

    def orphan_invoice(self, gross: int, on: date, invoice_no: str | None = None) -> LedgerEntry:
        self._inv += 1
        e = LedgerEntry(
            ledger_id=f"led_{self._inv}",
            invoice_no=invoice_no or f"INV/26-27/{self._inv}",
            date=on,
            gross=gross,
            status=LedgerStatus.PAID,
            source="synthetic",
        )
        self.ledger.append(e)
        return e

    def refund(
        self,
        p: RzPayment,
        amount: int | None = None,
        on: date = date(2026, 8, 14),
        credit_note: bool = False,
    ) -> RzRefund:
        r = RzRefund(
            refund_id=self.ids.refund(),
            payment_id=p.payment_id,
            amount=p.amount if amount is None else amount,
            created_at=at(on, 9),
            processed_at=at(on, 10),
            status=RefundStatus.PROCESSED,
        )
        self.refunds.append(r)
        if credit_note:
            self._inv += 1
            self.ledger.append(
                LedgerEntry(
                    ledger_id=f"led_{self._inv}",
                    invoice_no=f"CN/26-27/{self._inv}",
                    payment_ref=r.refund_id,
                    date=on,
                    gross=-r.amount,
                    status=LedgerStatus.PAID,
                    source="synthetic",
                )
            )
        return r

    def dispute(
        self, p: RzPayment, on: date = date(2026, 8, 9), status: DisputeStatus = DisputeStatus.OPEN
    ) -> RzDispute:
        d = RzDispute(
            dispute_id=self.ids.dispute(),
            payment_id=p.payment_id,
            amount=p.amount,
            phase=DisputePhase.CHARGEBACK,
            status=status,
            respond_by=at(on + timedelta(days=14)),
            created_at=at(on),
        )
        self.disputes.append(d)
        return d

    # --- settlement + bank -------------------------------------------------------

    def _utr(self, mode: TransferMode, on: date) -> str:
        self._seq += 1
        code = IFSC_BANK_CODES.get(self.bank.value, "HDFC")
        if mode == TransferMode.NEFT:
            return make_neft_utr(code, on, self._seq)
        if mode == TransferMode.RTGS:
            return make_rtgs_utr(code, on, self._seq)
        return make_imps_rrn(622_400_000_000 + self._seq)

    def settle(
        self,
        payments: list[RzPayment],
        on: date,
        *,
        refunds: list[RzRefund] | None = None,
        disputes: list[RzDispute] | None = None,
        adjustments: list[tuple[int, str]] | None = None,
        on_hold: list[RzPayment] | None = None,
        instant_fee: int = 0,
        type_: SettlementType = SettlementType.STANDARD,
        status: SettlementStatus = SettlementStatus.PROCESSED,
        mode: TransferMode = TransferMode.NEFT,
        bank_credit: bool = True,
        bank_on: date | None = None,
        narration_max_len: int | None = None,
        split: tuple[int, ...] | None = None,
        amount_override: int | None = None,
        continuation_of: str | None = None,
        retry_of: str | None = None,
        duplicate_credit: bool = False,
    ) -> RzSettlement:
        sid = self.ids.settlement()
        settled_at = at(on, 6)
        net = 0
        fees = tax = 0
        for p in payments:
            self.lines.append(
                RzReconLine(
                    entity_id=p.payment_id,
                    type=ReconLineType.PAYMENT,
                    settlement_id=sid,
                    debit=0,
                    credit=p.net,
                    amount=p.amount,
                    fee=p.fee,
                    tax=p.tax,
                    settled=True,
                    created_at=p.created_at,
                    settled_at=settled_at,
                    settlement_utr=None,
                    order_id=p.order_id,
                    order_receipt=p.order_receipt,
                    payment_id=p.payment_id,
                    method=p.method,
                    card_network=p.card_network,
                    card_type=p.card_type,
                )
            )
            net += p.net
            fees += p.fee
            tax += p.tax
        for r in refunds or []:
            self.lines.append(
                RzReconLine(
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
                )
            )
            net -= r.amount
        for d in disputes or []:
            won = d.status == DisputeStatus.WON
            self.lines.append(
                RzReconLine(
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
            )
            net += d.amount if won else -d.amount
        for amt, reason in adjustments or []:
            aid = self.ids.adjustment()
            self.adjustments.append(
                RzAdjustment(
                    adjustment_id=aid,
                    amount=amt,
                    reason=reason,
                    created_at=settled_at,
                    settlement_id=sid,
                )
            )
            self.lines.append(
                RzReconLine(
                    entity_id=aid,
                    type=ReconLineType.ADJUSTMENT,
                    settlement_id=sid,
                    debit=-amt if amt < 0 else 0,
                    credit=amt if amt > 0 else 0,
                    amount=abs(amt),
                    fee=0,
                    tax=0,
                    settled=True,
                    created_at=settled_at,
                    settled_at=settled_at,
                    description=reason,
                )
            )
            net += amt
        if instant_fee:
            aid = self.ids.adjustment()
            self.lines.append(
                RzReconLine(
                    entity_id=aid,
                    type=ReconLineType.ADJUSTMENT,
                    settlement_id=sid,
                    debit=instant_fee,
                    credit=0,
                    amount=instant_fee,
                    fee=0,
                    tax=0,
                    settled=True,
                    created_at=settled_at,
                    settled_at=settled_at,
                    description="Instant settlement fee",
                )
            )
            net -= instant_fee
        for p in on_hold or []:
            self.lines.append(
                RzReconLine(
                    entity_id=p.payment_id,
                    type=ReconLineType.PAYMENT,
                    settlement_id=sid,
                    debit=0,
                    credit=p.net,
                    amount=p.amount,
                    fee=p.fee,
                    tax=p.tax,
                    settled=False,
                    on_hold=True,
                    created_at=p.created_at,
                    payment_id=p.payment_id,
                    order_receipt=p.order_receipt,
                    method=p.method,
                )
            )
        amount = net if amount_override is None else amount_override
        utr = self._utr(mode, on)
        s = RzSettlement(
            settlement_id=sid,
            amount=amount,
            fees=fees,
            tax=tax,
            utr=utr,
            status=status,
            type=type_,
            mode=mode,
            created_at=settled_at,
            settled_at=settled_at if status != SettlementStatus.CREATED else None,
            continuation_of=continuation_of,
            retry_of=retry_of,
        )
        self.settlements.append(s)
        if bank_credit and status == SettlementStatus.PROCESSED:
            bank_day = bank_on or on
            if split:
                assert sum(split) == amount
                for i, part in enumerate(split):
                    u = utr if i == 0 else self._utr(mode, on)
                    self.bank_credit(
                        part,
                        bank_day,
                        render_narration(self.bank, mode, u, max_len=narration_max_len),
                    )
            else:
                narr = render_narration(self.bank, mode, utr, max_len=narration_max_len)
                self.bank_credit(amount, bank_day, narr)
                if duplicate_credit:
                    self.bank_credit(amount, bank_day, narr)
        return s

    def bank_credit(self, amount: int, on: date, narration: str) -> BankTxn:
        self._row += 1
        t = BankTxn(
            bank_txn_id=f"bank_{self._row:05d}",
            bank=self.bank,
            value_date=on,
            posted_date=on,
            narration_raw=narration,
            narration=parse_narration(narration, self.bank),
            credit=amount,
            source_file="statement.csv",
            row_no=self._row,
        )
        self.bank_txns.append(t)
        return t

    def build(self) -> Month:
        return Month(
            as_of=self.as_of,
            payments=tuple(self.payments),
            refunds=tuple(self.refunds),
            disputes=tuple(self.disputes),
            adjustments=tuple(self.adjustments),
            settlements=tuple(self.settlements),
            recon_lines=tuple(self.lines),
            bank_txns=tuple(self.bank_txns),
            ledger=tuple(self.ledger),
        )
