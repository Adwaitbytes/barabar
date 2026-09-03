"""Razorpay REST client (test mode first, live-ready). Read paths pull a month of
payments, refunds, disputes, settlements and recon lines into the normalised
model; the seed path creates orders and payment links so the judge's test
dashboard reconciles with what Barabar shows. Nothing here moves money."""

from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any

import httpx

from barabar.adapters.razorpay_json import (
    dispute_from_api,
    payment_from_api,
    recon_line_from_api,
    refund_from_api,
    settlement_from_api,
)
from barabar.core.models import RzDispute, RzPayment, RzReconLine, RzRefund, RzSettlement

BASE_URL = "https://api.razorpay.com/v1"
PAGE = 100


class RazorpayClient:
    def __init__(
        self,
        key_id: str | None = None,
        key_secret: str | None = None,
        *,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        key_id = key_id or os.environ.get("RAZORPAY_KEY_ID", "")
        key_secret = key_secret or os.environ.get("RAZORPAY_KEY_SECRET", "")
        if not key_id or not key_secret:
            raise RuntimeError("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set")
        if not key_id.startswith("rzp_test_"):
            raise RuntimeError(
                "refusing to run with a non-test key; Barabar's demo is test-mode only"
            )
        self.http = httpx.Client(
            base_url=BASE_URL, auth=(key_id, key_secret), timeout=30.0, transport=transport
        )

    # --- paging --------------------------------------------------------------------

    def _collection(self, path: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        skip = 0
        while True:
            r = self.http.get(path, params={**(params or {}), "count": PAGE, "skip": skip})
            if r.status_code == 404 and path.endswith("/settlements/recon"):
                return items  # Razorpay answers 404 when a month has no settlement data
            r.raise_for_status()
            batch = r.json().get("items", [])
            items.extend(batch)
            if len(batch) < PAGE:
                return items
            skip += PAGE

    @staticmethod
    def _window(year: int, month: int) -> dict[str, int]:
        start = datetime(year, month, 1, tzinfo=UTC)
        end = datetime(year + (month // 12), month % 12 + 1, 1, tzinfo=UTC)
        return {"from": int(start.timestamp()), "to": int(end.timestamp()) - 1}

    # --- reads -------------------------------------------------------------------------

    def payments(self, year: int, month: int) -> list[RzPayment]:
        raw = self._collection("/payments", {**self._window(year, month), "expand[]": "card"})
        out: list[RzPayment] = []
        for d in raw:
            order_receipt = None
            if d.get("order_id"):
                notes = d.get("notes") or {}
                order_receipt = notes.get("order_receipt") if isinstance(notes, dict) else None
            if order_receipt:
                d = {**d, "order_receipt": order_receipt}
            out.append(payment_from_api(d))
        return out

    def refunds(self, year: int, month: int) -> list[RzRefund]:
        return [refund_from_api(d) for d in self._collection("/refunds", self._window(year, month))]

    def disputes(self) -> list[RzDispute]:
        return [dispute_from_api(d) for d in self._collection("/disputes")]

    def settlements(self, year: int, month: int) -> list[RzSettlement]:
        return [
            settlement_from_api(d)
            for d in self._collection("/settlements", self._window(year, month))
        ]

    def recon_lines(self, year: int, month: int) -> list[RzReconLine]:
        return [
            recon_line_from_api(d)
            for d in self._collection("/settlements/recon", {"year": year, "month": month})
        ]

    def order_receipts(self, year: int, month: int) -> dict[str, str]:
        return {
            str(o["id"]): str(o["receipt"])
            for o in self._collection("/orders", self._window(year, month))
            if o.get("receipt")
        }

    # --- seeding (test mode) --------------------------------------------------------------

    def create_order(
        self, amount: int, receipt: str, notes: dict[str, str] | None = None
    ) -> dict[str, Any]:
        r = self.http.post(
            "/orders",
            json={
                "amount": amount,
                "currency": "INR",
                "receipt": receipt,
                "notes": {**(notes or {}), "order_receipt": receipt},
            },
        )
        r.raise_for_status()
        return r.json()

    def create_payment_link(
        self, amount: int, reference_id: str, description: str
    ) -> dict[str, Any]:
        r = self.http.post(
            "/payment_links",
            json={
                "amount": amount,
                "currency": "INR",
                "reference_id": reference_id,
                "description": description,
                "notes": {"order_receipt": reference_id},
            },
        )
        r.raise_for_status()
        return r.json()

    def create_refund(self, payment_id: str, amount: int | None = None) -> dict[str, Any]:
        r = self.http.post(
            f"/payments/{payment_id}/refund", json={"amount": amount} if amount else {}
        )
        r.raise_for_status()
        return r.json()


def fetch_month(client: RazorpayClient, year: int, month: int) -> dict[str, tuple[Any, ...]]:
    """Everything Razorpay knows about a month, in the normalised model. Recon lines are
    empty on accounts where settlements are not generated (test mode), the caller then
    runs the Settlement Simulator over the real entities."""
    payments = client.payments(year, month)
    receipts = client.order_receipts(year, month)
    payments = [
        p.model_copy(update={"order_receipt": receipts.get(p.order_id or "", p.order_receipt)})
        for p in payments
    ]
    return {
        "payments": tuple(payments),
        "refunds": tuple(client.refunds(year, month)),
        "disputes": tuple(client.disputes()),
        "settlements": tuple(client.settlements(year, month)),
        "recon_lines": tuple(client.recon_lines(year, month)),
    }
