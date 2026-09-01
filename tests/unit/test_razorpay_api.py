import json
from datetime import UTC, datetime

import httpx
import pytest

from barabar.adapters.razorpay_api import RazorpayClient, fetch_month


def _handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    skip = int(request.url.params.get("skip", 0))
    if skip > 0:
        return httpx.Response(200, json={"entity": "collection", "count": 0, "items": []})
    now = int(datetime(2026, 8, 12, 6, 0, tzinfo=UTC).timestamp())
    if path.endswith("/payments"):
        return httpx.Response(
            200,
            json={
                "items": [
                    {
                        "id": "pay_live1",
                        "entity": "payment",
                        "amount": 100000,
                        "currency": "INR",
                        "status": "captured",
                        "order_id": "order_1",
                        "method": "card",
                        "captured": True,
                        "fee": 2000,
                        "tax": 360,
                        "card": {"network": "Visa", "type": "credit"},
                        "notes": {},
                        "created_at": now,
                        "captured_at": now,
                    }
                ]
            },
        )
    if path.endswith("/orders"):
        return httpx.Response(
            200, json={"items": [{"id": "order_1", "receipt": "rcpt_seed_42_001"}]}
        )
    if path.endswith("/refunds"):
        return httpx.Response(
            200,
            json={
                "items": [
                    {
                        "id": "rfnd_1",
                        "payment_id": "pay_live1",
                        "amount": 5000,
                        "status": "processed",
                        "created_at": now,
                        "speed_processed": "normal",
                    }
                ]
            },
        )
    if path.endswith("/disputes"):
        return httpx.Response(200, json={"items": []})
    if path.endswith("/settlements/recon"):
        return httpx.Response(200, json={"items": []})
    if path.endswith("/settlements"):
        return httpx.Response(200, json={"items": []})
    if path.endswith("/orders") and request.method == "POST":
        return httpx.Response(
            200, json={"id": "order_new", "receipt": json.loads(request.content)["receipt"]}
        )
    return httpx.Response(404)


def test_fetch_month_maps_entities_and_receipts() -> None:
    client = RazorpayClient("rzp_test_x", "secret", transport=httpx.MockTransport(_handler))
    parts = fetch_month(client, 2026, 8)
    assert parts["payments"][0].order_receipt == "rcpt_seed_42_001"
    assert parts["payments"][0].fee == 2000 and parts["payments"][0].card_network == "Visa"
    assert parts["refunds"][0].amount == 5000
    assert parts["recon_lines"] == ()


def test_refuses_live_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(RuntimeError):
        RazorpayClient("rzp_live_x", "secret")
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    with pytest.raises(RuntimeError):
        RazorpayClient()
