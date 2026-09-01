"""Deterministic Razorpay-style identifiers for the generator and simulator.
Razorpay IDs are ``<prefix>_<14 base62 chars>``; we keep the shape so fixtures
look real and adapters cannot tell synthetic from live by format alone."""

from __future__ import annotations

import random
import string
from typing import Final

_ALPHABET: Final = string.ascii_letters + string.digits
ID_LEN: Final = 14


class IdGen:
    def __init__(self, seed: int) -> None:
        self._rng = random.Random(f"barabar-ids-{seed}")
        self._seen: set[str] = set()

    def next(self, prefix: str) -> str:
        while True:
            body = "".join(self._rng.choice(_ALPHABET) for _ in range(ID_LEN))
            candidate = f"{prefix}_{body}"
            if candidate not in self._seen:
                self._seen.add(candidate)
                return candidate

    def payment(self) -> str:
        return self.next("pay")

    def order(self) -> str:
        return self.next("order")

    def refund(self) -> str:
        return self.next("rfnd")

    def dispute(self) -> str:
        return self.next("disp")

    def settlement(self) -> str:
        return self.next("setl")

    def adjustment(self) -> str:
        return self.next("adj")
