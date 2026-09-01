"""Integer-paise money. No float ever touches an amount.

Every amount in Barabar is an ``int`` number of paise, exactly as Razorpay's API
returns it. Percentage math is integer arithmetic under one named rounding policy.
Changing the policy changes the run's ``config_hash``; see ``docs/DECISIONS.md``.
"""

from __future__ import annotations

import re
from typing import Final, NewType

Paise = NewType("Paise", int)

ROUNDING_POLICY: Final[str] = "ROUND_HALF_UP"
"""Half-paise round away from zero (Decimal's ROUND_HALF_UP). Appendix B of the PRD."""

GST_ON_FEE_BPS: Final[int] = 1800
"""18% GST on payment-gateway fees (not on the transaction value)."""

BPS_DENOMINATOR: Final[int] = 10_000


def round_half_up_div(numerator: int, denominator: int) -> int:
    """Integer division rounded half away from zero, without floats or Decimal."""
    if denominator <= 0:
        raise ValueError("denominator must be positive")
    if numerator >= 0:
        return (2 * numerator + denominator) // (2 * denominator)
    return -((2 * -numerator + denominator) // (2 * denominator))


def apply_bps(amount: int, rate_bps: int) -> int:
    """``amount * rate_bps / 10_000`` under ROUNDING_POLICY. Used for fees and GST."""
    if rate_bps < 0:
        raise ValueError("rate_bps must be non-negative")
    return round_half_up_div(amount * rate_bps, BPS_DENOMINATOR)


_INR_RE: Final = re.compile(
    r"^\s*(?P<open>\()?\s*(?P<sign>[-+])?\s*(?:₹|Rs\.?|INR)?\s*"
    r"(?P<int>\d[\d,]*)?(?:\.(?P<frac>\d+))?\s*(?P<close>\))?\s*$",
    re.IGNORECASE,
)


def parse_inr(text: str) -> int:
    """Parse a human/bank-formatted rupee string into paise.

    Accepts ``"1,83,412.37"``, ``"₹1,83,412"``, ``"Rs. 4200.00"``, ``"-4200"``,
    ``"(4,200.00)"`` (accounting negative). Rejects more than two decimals: a
    third decimal is a data error, not something to round silently.
    """
    m = _INR_RE.match(text)
    if not m or (m.group("int") is None and m.group("frac") is None):
        raise ValueError(f"not a rupee amount: {text!r}")
    if bool(m.group("open")) != bool(m.group("close")):
        raise ValueError(f"unbalanced parentheses: {text!r}")
    frac = m.group("frac") or ""
    if len(frac) > 2:
        raise ValueError(f"more than two decimals in rupee amount: {text!r}")
    whole = int((m.group("int") or "0").replace(",", ""))
    paise = whole * 100 + int(frac.ljust(2, "0")) if frac else whole * 100
    negative = m.group("sign") == "-" or bool(m.group("open"))
    return -paise if negative else paise


def format_inr(paise: int, *, symbol: bool = True) -> str:
    """Render paise as ``₹1,83,412.37`` with Indian digit grouping."""
    sign = "-" if paise < 0 else ""
    paise = abs(paise)
    rupees, p = divmod(paise, 100)
    digits = str(rupees)
    if len(digits) > 3:
        head, tail = digits[:-3], digits[-3:]
        groups: list[str] = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        digits = ",".join([*groups, tail])
    return f"{sign}{'₹' if symbol else ''}{digits}.{p:02d}"


def rupees(whole: int, paise: int = 0) -> int:
    """Readable constructor for tests and fixtures: ``rupees(1_83_412, 37)``."""
    if paise < 0 or paise > 99:
        raise ValueError("paise component must be 0..99")
    return whole * 100 + paise
