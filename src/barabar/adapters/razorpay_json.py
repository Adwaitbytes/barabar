"""Razorpay-shaped JSON in and out: payments/refunds/disputes/settlements as the
API returns them (paise ints, epoch seconds), recon lines as ``/settlements/recon``
items. Used by the ingest path (upload) and by the dataset writer."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from barabar.core.models import (
    DisputePhase,
    DisputeStatus,
    Month,
    PaymentStatus,
    ReconLineType,
    RefundSpeed,
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


def _epoch(dt: datetime | None) -> int | None:
    return int(dt.timestamp()) if dt else None


def _dt(v: Any) -> datetime | None:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(int(v), tz=UTC)
    return datetime.fromisoformat(str(v))


# --- to API shape --------------------------------------------------------------


def payment_to_api(p: RzPayment) -> dict[str, Any]:
    return {
        "id": p.payment_id,
        "entity": "payment",
        "amount": p.amount,
        "currency": p.currency,
        "status": p.status.value,
        "order_id": p.order_id,
        "method": p.method,
        "captured": p.captured_at is not None,
        "fee": p.fee,
        "tax": p.tax,
        "card": {"network": p.card_network, "type": p.card_type, "international": p.international}
        if p.method == "card"
        else None,
        "international": p.international,
        "notes": {**p.notes, **({"order_receipt": p.order_receipt} if p.order_receipt else {})},
        "created_at": _epoch(p.created_at),
        "captured_at": _epoch(p.captured_at),
    }


def refund_to_api(r: RzRefund) -> dict[str, Any]:
    return {
        "id": r.refund_id,
        "entity": "refund",
        "amount": r.amount,
        "currency": "INR",
        "payment_id": r.payment_id,
        "status": r.status.value,
        "speed_processed": r.speed.value,
        "created_at": _epoch(r.created_at),
        "processed_at": _epoch(r.processed_at),
    }


def dispute_to_api(d: RzDispute) -> dict[str, Any]:
    return {
        "id": d.dispute_id,
        "entity": "dispute",
        "payment_id": d.payment_id,
        "amount": d.amount,
        "currency": "INR",
        "phase": d.phase.value,
        "status": d.status.value,
        "respond_by": _epoch(d.respond_by),
        "created_at": _epoch(d.created_at),
        "resolved_at": _epoch(d.resolved_at),
    }


def settlement_to_api(s: RzSettlement) -> dict[str, Any]:
    return {
        "id": s.settlement_id,
        "entity": "settlement",
        "amount": s.amount,
        "status": s.status.value,
        "fees": s.fees,
        "tax": s.tax,
        "utr": s.utr,
        "created_at": _epoch(s.created_at),
        "settled_at": _epoch(s.settled_at),
        "type": s.type.value,
        "mode": s.mode.value,
        "continuation_of": s.continuation_of,
        "retry_of": s.retry_of,
    }


def recon_line_to_api(ln: RzReconLine) -> dict[str, Any]:
    return {
        "entity_id": ln.entity_id,
        "type": ln.type.value,
        "debit": ln.debit,
        "credit": ln.credit,
        "amount": ln.amount,
        "currency": ln.currency,
        "fee": ln.fee,
        "tax": ln.tax,
        "on_hold": ln.on_hold,
        "settled": ln.settled,
        "created_at": _epoch(ln.created_at),
        "settled_at": _epoch(ln.settled_at),
        "settlement_id": ln.settlement_id,
        "posted_at": _epoch(ln.posted_at),
        "credit_type": ln.credit_type,
        "description": ln.description,
        "notes": ln.notes,
        "payment_id": ln.payment_id,
        "settlement_utr": ln.settlement_utr,
        "order_id": ln.order_id,
        "order_receipt": ln.order_receipt,
        "method": ln.method,
        "card_network": ln.card_network,
        "card_issuer": None,
        "card_type": ln.card_type,
        "dispute_id": ln.dispute_id,
    }


def adjustment_to_api(a: RzAdjustment) -> dict[str, Any]:
    return {
        "id": a.adjustment_id,
        "entity": "adjustment",
        "amount": a.amount,
        "description": a.reason,
        "created_at": _epoch(a.created_at),
        "settlement_id": a.settlement_id,
    }


# --- from API shape --------------------------------------------------------------


def payment_from_api(d: dict[str, Any]) -> RzPayment:
    card = d.get("card") or {}
    notes = dict(d.get("notes") or {})
    receipt = notes.pop("order_receipt", None) or d.get("order_receipt")
    return RzPayment(
        payment_id=d["id"],
        order_id=d.get("order_id"),
        order_receipt=receipt,
        amount=int(d["amount"]),
        fee=int(d.get("fee") or 0),
        tax=int(d.get("tax") or 0),
        method=d["method"],
        card_network=card.get("network"),
        card_type=card.get("type"),
        international=bool(d.get("international") or card.get("international") or False),
        currency=d.get("currency") or "INR",
        captured_at=_dt(d.get("captured_at"))
        or (_dt(d["created_at"]) if d.get("captured") else None),
        created_at=_dt(d["created_at"]) or datetime.now(tz=UTC),
        status=PaymentStatus(d["status"]),
        notes={k: str(v) for k, v in notes.items()},
    )


def refund_from_api(d: dict[str, Any]) -> RzRefund:
    return RzRefund(
        refund_id=d["id"],
        payment_id=d["payment_id"],
        amount=int(d["amount"]),
        created_at=_dt(d["created_at"]) or datetime.now(tz=UTC),
        processed_at=_dt(d.get("processed_at")),
        status=RefundStatus(d["status"]),
        speed=RefundSpeed(d.get("speed_processed") or d.get("speed_requested") or "normal"),
    )


def dispute_from_api(d: dict[str, Any]) -> RzDispute:
    return RzDispute(
        dispute_id=d["id"],
        payment_id=d["payment_id"],
        amount=int(d["amount"]),
        phase=DisputePhase(d["phase"]),
        status=DisputeStatus(d["status"]),
        respond_by=_dt(d.get("respond_by")),
        created_at=_dt(d["created_at"]) or datetime.now(tz=UTC),
        resolved_at=_dt(d.get("resolved_at")),
    )


def settlement_from_api(d: dict[str, Any]) -> RzSettlement:
    return RzSettlement(
        settlement_id=d["id"],
        amount=int(d["amount"]),
        fees=int(d.get("fees") or 0),
        tax=int(d.get("tax") or 0),
        utr=d.get("utr"),
        status=SettlementStatus(d["status"]),
        type=SettlementType(d.get("type") or "standard"),
        mode=TransferMode(d.get("mode") or "NEFT"),
        created_at=_dt(d["created_at"]) or datetime.now(tz=UTC),
        settled_at=_dt(d.get("settled_at")),
        continuation_of=d.get("continuation_of"),
        retry_of=d.get("retry_of"),
    )


def recon_line_from_api(d: dict[str, Any]) -> RzReconLine:
    return RzReconLine(
        entity_id=d["entity_id"],
        type=ReconLineType(d["type"]),
        settlement_id=d.get("settlement_id"),
        debit=int(d.get("debit") or 0),
        credit=int(d.get("credit") or 0),
        amount=int(d["amount"]),
        fee=int(d.get("fee") or 0),
        tax=int(d.get("tax") or 0),
        currency=d.get("currency") or "INR",
        on_hold=bool(d.get("on_hold")),
        settled=bool(d.get("settled")),
        created_at=_dt(d["created_at"]) or datetime.now(tz=UTC),
        settled_at=_dt(d.get("settled_at")),
        posted_at=_dt(d.get("posted_at")),
        settlement_utr=d.get("settlement_utr"),
        credit_type=d.get("credit_type") or "default",
        description=d.get("description"),
        notes=d.get("notes") if isinstance(d.get("notes"), str) else None,
        order_id=d.get("order_id"),
        order_receipt=d.get("order_receipt"),
        payment_id=d.get("payment_id"),
        dispute_id=d.get("dispute_id"),
        method=d.get("method"),
        card_network=d.get("card_network"),
        card_type=d.get("card_type"),
    )


def adjustment_from_api(d: dict[str, Any]) -> RzAdjustment:
    return RzAdjustment(
        adjustment_id=d["id"],
        amount=int(d["amount"]),
        reason=d.get("description") or "",
        created_at=_dt(d["created_at"]) or datetime.now(tz=UTC),
        settlement_id=d.get("settlement_id"),
    )


# --- dataset directory ---------------------------------------------------------------

FILES = {
    "payments": ("razorpay_payments.json", payment_to_api, payment_from_api),
    "refunds": ("razorpay_refunds.json", refund_to_api, refund_from_api),
    "disputes": ("razorpay_disputes.json", dispute_to_api, dispute_from_api),
    "adjustments": ("razorpay_adjustments.json", adjustment_to_api, adjustment_from_api),
    "settlements": ("razorpay_settlements.json", settlement_to_api, settlement_from_api),
    "recon_lines": ("razorpay_settlement_recon.json", recon_line_to_api, recon_line_from_api),
}


def write_razorpay_dir(month: Month, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for attr, (name, to_api, _) in FILES.items():
        items = [to_api(x) for x in getattr(month, attr)]  # type: ignore[operator]
        (out / name).write_text(
            json.dumps({"entity": "collection", "count": len(items), "items": items}, indent=1),
            encoding="utf-8",
        )


def read_razorpay_dir(src: Path) -> dict[str, tuple[Any, ...]]:
    result: dict[str, tuple[Any, ...]] = {}
    for attr, (name, _, from_api) in FILES.items():
        path = src / name
        if not path.exists():
            result[attr] = ()
            continue
        raw = json.loads(path.read_text(encoding="utf-8"))
        items = raw["items"] if isinstance(raw, dict) else raw
        result[attr] = tuple(from_api(i) for i in items)
    return result
