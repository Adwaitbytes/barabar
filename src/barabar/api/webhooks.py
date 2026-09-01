"""Razorpay webhook verification: HMAC-SHA256 of the raw body with the webhook
secret, compared in constant time against ``X-Razorpay-Signature``."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any


def verify_signature(body: bytes, signature: str | None, secret: str | None) -> bool:
    if not signature or not secret:
        return False
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def event_identity(payload: dict[str, Any], header_event_id: str | None) -> str:
    """Razorpay sends ``x-razorpay-event-id``; fall back to the entity id + event name."""
    if header_event_id:
        return header_event_id
    event = str(payload.get("event", "unknown"))
    entity = payload.get("payload", {})
    for key in ("payment", "refund", "settlement", "dispute", "order"):
        node = entity.get(key, {}).get("entity") if isinstance(entity.get(key), dict) else None
        if node and node.get("id"):
            return f"{event}:{node['id']}"
    return f"{event}:{hashlib.sha256(repr(sorted(payload.items())).encode()).hexdigest()[:16]}"
