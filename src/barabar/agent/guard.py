"""NumberGuard: every rupee figure an LLM writes must exist in the numbers its
tools actually returned (or in the run's metrics). A mismatch blocks the message
and is logged. This is what stops "helpful" rounding of ₹1,83,412.37."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from barabar.core.money import parse_inr

_MONEY_RE = re.compile(
    r"(?:₹|Rs\.?\s?|INR\s?)\s?-?\d[\d,]*(?:\.\d{1,2})?|(?<![\w.])-?\d{1,3}(?:,\d{2,3})+(?:\.\d{2})?(?![\w.])|(?<![\w.,])\d+\.\d{2}(?![\w.])"
)


@dataclass
class GuardReport:
    numbers_checked: int = 0
    unverified: list[str] = field(default_factory=list)

    @property
    def blocked(self) -> bool:
        return bool(self.unverified)


def extract_money(text: str) -> list[str]:
    return [m.group(0).strip() for m in _MONEY_RE.finditer(text)]


def check_numbers(text: str, allowed_paise: set[int]) -> GuardReport:
    """Allowed figures: any exact paise value returned by a tool, plus its rupee
    (÷100) rendering. Percentages and small counts are not money and are ignored."""
    report = GuardReport()
    allowed_rupees = {p // 100 for p in allowed_paise if p % 100 == 0}
    for token in extract_money(text):
        try:
            paise = abs(parse_inr(token))
        except ValueError:
            continue
        report.numbers_checked += 1
        whole_rupee = paise % 100 == 0 and "." not in token
        ok = (
            paise in allowed_paise
            or (whole_rupee and paise // 100 in allowed_rupees)
            or (whole_rupee and paise // 100 in allowed_paise)
        )
        if not ok:
            report.unverified.append(token)
    return report
