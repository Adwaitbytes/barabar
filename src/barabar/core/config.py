"""Run configuration. Every knob here is part of ``config_hash``: change a
tolerance and the run is a different run."""

from __future__ import annotations

from dataclasses import dataclass, field

from barabar.core.calendar import SettlementCalendar
from barabar.core.hashing import content_hash
from barabar.core.ratecard import RateCard


@dataclass(frozen=True)
class MatchConfig:
    calendar: SettlementCalendar = field(default_factory=SettlementCalendar.rbi)
    rate_card: RateCard = field(default_factory=RateCard)
    tolerance_paise: int = 0
    """B1: batch net vs bank credit must agree to this many paise (default exact)."""
    rounding_line_paise: int = 1
    rounding_batch_paise: int = 100
    auto_accept_threshold: float = 0.92
    """Links below this confidence are proposals (exceptions with a candidate)."""
    tier_c_cap: float = 0.85
    tier_c_ledger_cap: float = 0.80
    bank_lag_working_days: int = 1
    date_window_working_days: int = 3
    max_split_credits: int = 4
    prefix_min_len: int = 10
    ledger_tolerance_paise: int = 100
    ledger_date_window_days: int = 3
    razorpay_similarity_min: int = 80

    def config_dict(self) -> dict[str, object]:
        return {
            "calendar": self.calendar.config(),
            "rate_card": self.rate_card.config(),
            "tolerance_paise": self.tolerance_paise,
            "rounding_line_paise": self.rounding_line_paise,
            "rounding_batch_paise": self.rounding_batch_paise,
            "auto_accept_threshold": self.auto_accept_threshold,
            "tier_c_cap": self.tier_c_cap,
            "tier_c_ledger_cap": self.tier_c_ledger_cap,
            "bank_lag_working_days": self.bank_lag_working_days,
            "date_window_working_days": self.date_window_working_days,
            "max_split_credits": self.max_split_credits,
            "prefix_min_len": self.prefix_min_len,
            "ledger_tolerance_paise": self.ledger_tolerance_paise,
            "ledger_date_window_days": self.ledger_date_window_days,
            "razorpay_similarity_min": self.razorpay_similarity_min,
            "rounding_policy": "ROUND_HALF_UP",
        }

    def config_hash(self) -> str:
        return content_hash(self.config_dict())
