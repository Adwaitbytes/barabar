"""Normalised data model (PRD §6). All amounts int paise; all timestamps UTC-aware;
IDs are Razorpay's where they exist. Models are frozen: a run never mutates its
inputs, it produces links and exceptions that reference them."""

from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from barabar.core.exceptions import ExceptionType

Paise = Annotated[int, Field(strict=True)]


def _aware(v: datetime | None) -> datetime | None:
    if v is not None and v.tzinfo is None:
        raise ValueError("timestamps must be timezone-aware (store UTC)")
    return v


class Frozen(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", str_strip_whitespace=True)


# --- enums -------------------------------------------------------------------


class PaymentStatus(StrEnum):
    CREATED = "created"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    FAILED = "failed"


class RefundStatus(StrEnum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class RefundSpeed(StrEnum):
    NORMAL = "normal"
    OPTIMUM = "optimum"
    INSTANT = "instant"


class DisputePhase(StrEnum):
    FRAUD = "fraud"
    RETRIEVAL = "retrieval"
    CHARGEBACK = "chargeback"
    PRE_ARBITRATION = "pre_arbitration"
    ARBITRATION = "arbitration"


class DisputeStatus(StrEnum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    WON = "won"
    LOST = "lost"
    CLOSED = "closed"


class SettlementType(StrEnum):
    STANDARD = "standard"
    INSTANT = "instant"
    PARTIAL = "partial"


class SettlementStatus(StrEnum):
    CREATED = "created"
    PROCESSED = "processed"
    FAILED = "failed"


class TransferMode(StrEnum):
    NEFT = "NEFT"
    RTGS = "RTGS"
    IMPS = "IMPS"
    UPI = "UPI"
    OTHER = "OTHER"


class ReconLineType(StrEnum):
    PAYMENT = "payment"
    REFUND = "refund"
    TRANSFER = "transfer"
    ADJUSTMENT = "adjustment"


class Bank(StrEnum):
    HDFC = "HDFC"
    ICICI = "ICICI"
    SBI = "SBI"
    AXIS = "AXIS"
    KOTAK = "KOTAK"
    RAZORPAYX = "RAZORPAYX"
    UNKNOWN = "UNKNOWN"


class LedgerStatus(StrEnum):
    OPEN = "open"
    PAID = "paid"
    PARTIAL = "partial"
    CANCELLED = "cancelled"


class Tier(StrEnum):
    A = "A"
    B = "B"
    C = "C"
    D_ACCEPTED = "D-accepted"


class ExceptionStatus(StrEnum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    ACCEPTED = "accepted"
    AUTO_RESOLVED = "auto_resolved"


class EntityKind(StrEnum):
    PAYMENT = "payment"
    REFUND = "refund"
    DISPUTE = "dispute"
    ADJUSTMENT = "adjustment"
    SETTLEMENT = "settlement"
    RECON_LINE = "recon_line"
    BANK = "bank"
    LEDGER = "ledger"


def ref(kind: EntityKind, entity_id: str) -> str:
    """Stable entity reference ``kind:id`` used in links, exceptions and audit."""
    return f"{kind.value}:{entity_id}"


# --- Razorpay-side entities -------------------------------------------------


class RzPayment(Frozen):
    payment_id: str
    order_id: str | None = None
    order_receipt: str | None = None
    amount: Paise
    fee: Paise
    tax: Paise
    method: str
    card_network: str | None = None
    card_type: str | None = None
    international: bool = False
    currency: str = "INR"
    captured_at: datetime | None
    created_at: datetime
    status: PaymentStatus
    notes: dict[str, str] = Field(default_factory=dict)

    _aware = field_validator("captured_at", "created_at")(_aware)

    @property
    def net(self) -> int:
        return self.amount - self.fee - self.tax


class RzRefund(Frozen):
    refund_id: str
    payment_id: str
    amount: Paise
    created_at: datetime
    processed_at: datetime | None = None
    status: RefundStatus
    speed: RefundSpeed = RefundSpeed.NORMAL

    _aware = field_validator("created_at", "processed_at")(_aware)


class RzDispute(Frozen):
    dispute_id: str
    payment_id: str
    amount: Paise
    phase: DisputePhase
    status: DisputeStatus
    respond_by: datetime | None = None
    created_at: datetime
    resolved_at: datetime | None = None

    _aware = field_validator("respond_by", "created_at", "resolved_at")(_aware)


class RzAdjustment(Frozen):
    adjustment_id: str
    amount: Paise  # signed: +credit / -debit
    reason: str
    created_at: datetime
    settlement_id: str | None = None

    _aware = field_validator("created_at")(_aware)


class RzSettlement(Frozen):
    settlement_id: str
    amount: Paise  # net amount transferred
    fees: Paise
    tax: Paise
    utr: str | None
    status: SettlementStatus
    type: SettlementType = SettlementType.STANDARD
    mode: TransferMode = TransferMode.NEFT
    created_at: datetime
    settled_at: datetime | None = None
    continuation_of: str | None = None  # partial settlements chain
    retry_of: str | None = None  # failed-and-returned settlements chain

    _aware = field_validator("created_at", "settled_at")(_aware)


class RzReconLine(Frozen):
    """One row of ``GET /v1/settlements/recon`` (field names match Razorpay)."""

    entity_id: str
    type: ReconLineType
    settlement_id: str | None
    debit: Paise
    credit: Paise
    amount: Paise
    fee: Paise
    tax: Paise
    currency: str = "INR"
    on_hold: bool = False
    settled: bool = False
    created_at: datetime
    settled_at: datetime | None = None
    posted_at: datetime | None = None
    settlement_utr: str | None = None
    credit_type: str = "default"
    description: str | None = None
    notes: str | None = None
    order_id: str | None = None
    order_receipt: str | None = None
    payment_id: str | None = None
    dispute_id: str | None = None
    method: str | None = None
    card_network: str | None = None
    card_type: str | None = None

    _aware = field_validator("created_at", "settled_at", "posted_at")(_aware)

    @property
    def net(self) -> int:
        """Signed contribution of this line to the batch net."""
        return self.credit - self.debit


# --- bank and ledger --------------------------------------------------------


class NarrationParsed(Frozen):
    mode: TransferMode
    utr_full: str | None = None
    utr_prefix: str | None = None
    counterparty: str | None = None
    remarks: str | None = None
    settlement_id_hint: str | None = None
    razorpay_like: bool = False
    parser: str  # e.g. "grammar:HDFC" or "llm:claude"


class BankTxn(Frozen):
    bank_txn_id: str
    bank: Bank
    value_date: date
    posted_date: date
    narration_raw: str
    narration: NarrationParsed | None = None
    credit: Paise = 0
    debit: Paise = 0
    balance_after: Paise | None = None
    source_file: str
    row_no: int

    @property
    def amount(self) -> int:
        return self.credit - self.debit


class LedgerEntry(Frozen):
    ledger_id: str
    invoice_no: str
    customer_ref: str | None = None
    order_receipt: str | None = None
    payment_ref: str | None = None
    date: date
    gross: Paise
    gst_component: Paise | None = None
    status: LedgerStatus
    source: str  # "tally" | "zoho" | "csv" | "synthetic"
    notes: str | None = None


# --- run outputs ------------------------------------------------------------


class MatchLink(Frozen):
    link_id: str
    run_id: str
    from_entity: str
    to_entity: str
    tier: Tier
    rule_id: str
    confidence: float = Field(ge=0.0, le=1.0)
    amount_matched: Paise
    residual: Paise = 0
    created_at: datetime

    _aware = field_validator("created_at")(_aware)


class Evidence(Frozen):
    kind: Literal["tool_call", "record", "rule", "note"]
    ref: str
    summary: str
    result_hash: str | None = None


class ExceptionItem(Frozen):
    exc_id: str
    run_id: str
    type: ExceptionType
    subtype: str | None = None
    secondary_tags: tuple[ExceptionType, ...] = ()
    amount: Paise
    entities: tuple[str, ...]
    confidence: float = Field(ge=0.0, le=1.0)
    reason_code: str
    reason_text: str
    suggested_action: str
    status: ExceptionStatus = ExceptionStatus.OPEN
    evidence: tuple[Evidence, ...] = ()
    candidate_link: MatchLink | None = None
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    resolution_note: str | None = None

    _aware = field_validator("resolved_at")(_aware)


class Run(Frozen):
    run_id: str
    inputs_hash: str
    config_hash: str
    code_version: str
    outputs_hash: str | None = None
    as_of: date
    started_at: datetime
    finished_at: datetime | None = None
    stage: str = "created"
    metrics: dict[str, float | int | str] = Field(default_factory=dict)

    _aware = field_validator("started_at", "finished_at")(_aware)


class Month(Frozen):
    """Everything a run needs: the three legs plus Razorpay sub-entities, as of a date."""

    as_of: date
    payments: tuple[RzPayment, ...] = ()
    refunds: tuple[RzRefund, ...] = ()
    disputes: tuple[RzDispute, ...] = ()
    adjustments: tuple[RzAdjustment, ...] = ()
    settlements: tuple[RzSettlement, ...] = ()
    recon_lines: tuple[RzReconLine, ...] = ()
    bank_txns: tuple[BankTxn, ...] = ()
    ledger: tuple[LedgerEntry, ...] = ()

    @property
    def gross_captured(self) -> int:
        return sum(
            p.amount
            for p in self.payments
            if p.status in (PaymentStatus.CAPTURED, PaymentStatus.REFUNDED)
        )
