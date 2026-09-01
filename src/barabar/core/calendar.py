"""Settlement calendar: IST day boundaries, T+n working days, RBI holidays.

All timestamps are stored in UTC and converted to Asia/Kolkata *only* to decide
which calendar day a capture belongs to. Applying holidays in UTC is the classic
bug (it shifts a Friday-night capture into the wrong week); see FAILURES.md.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from importlib import resources
from typing import Literal
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
UTC = ZoneInfo("UTC")

WeekendPolicy = Literal["all_weekends", "second_fourth_saturdays_and_sundays"]

DEFAULT_CYCLE_WORKING_DAYS = 2
"""Razorpay standard settlement cycle: T+2 working days from capture."""

DEFAULT_CUTOFF_IST = time(23, 59, 59)


@dataclass(frozen=True)
class Holiday:
    date: date
    name: str
    scope: Literal["nationwide", "state"]


def load_rbi_holidays(year: int = 2026) -> tuple[Holiday, ...]:
    """Load the committed RBI holiday list for ``year`` from package data."""
    path = resources.files("barabar.core").joinpath("data", f"rbi_holidays_{year}.json")
    raw = json.loads(path.read_text(encoding="utf-8"))
    return tuple(
        Holiday(date=date.fromisoformat(h["date"]), name=h["name"], scope=h["scope"])
        for h in raw["holidays"]
    )


@dataclass(frozen=True)
class SettlementCalendar:
    holidays: frozenset[date]
    weekend_policy: WeekendPolicy = "all_weekends"
    cycle_working_days: int = DEFAULT_CYCLE_WORKING_DAYS
    cutoff_ist: time = DEFAULT_CUTOFF_IST

    @classmethod
    def rbi(
        cls,
        year: int = 2026,
        *,
        include_state_holidays: bool = False,
        **overrides: object,
    ) -> SettlementCalendar:
        days = frozenset(
            h.date
            for h in load_rbi_holidays(year)
            if h.scope == "nationwide" or include_state_holidays
        )
        return cls(holidays=days, **overrides)  # type: ignore[arg-type]

    def is_weekend_closure(self, d: date) -> bool:
        wd = d.weekday()  # Mon=0 .. Sun=6
        if wd == 6:
            return True
        if wd == 5:
            if self.weekend_policy == "all_weekends":
                return True
            # 2nd and 4th Saturdays of the month
            return (d.day - 1) // 7 in (1, 3)
        return False

    def is_working_day(self, d: date) -> bool:
        return not self.is_weekend_closure(d) and d not in self.holidays

    def next_working_day(self, d: date) -> date:
        """``d`` itself if it is a working day, else the first working day after it."""
        while not self.is_working_day(d):
            d += timedelta(days=1)
        return d

    def add_working_days(self, d: date, n: int) -> date:
        """The ``n``-th working day strictly after ``d`` (n ≥ 1); ``d`` shifted to a
        working day for n == 0."""
        if n < 0:
            raise ValueError("n must be non-negative")
        d = self.next_working_day(d)
        while n > 0:
            d += timedelta(days=1)
            if self.is_working_day(d):
                n -= 1
        return d

    def working_days_between(self, start: date, end: date) -> int:
        """Working days in ``(start, end]``; negative if end < start."""
        if end < start:
            return -self.working_days_between(end, start)
        count = 0
        d = start
        while d < end:
            d += timedelta(days=1)
            if self.is_working_day(d):
                count += 1
        return count

    def capture_day_ist(self, captured_at: datetime) -> date:
        """Calendar day (IST) a capture belongs to, honouring the daily cut-off."""
        if captured_at.tzinfo is None:
            raise ValueError("captured_at must be timezone-aware")
        local = captured_at.astimezone(IST)
        day = local.date()
        if local.time() > self.cutoff_ist:
            day += timedelta(days=1)
        return day

    def expected_settlement_date(self, captured_at: datetime) -> date:
        """T + cycle working days, where T is the IST capture day (shifted to a
        working day if the capture happened on a closure)."""
        return self.add_working_days(self.capture_day_ist(captured_at), self.cycle_working_days)

    def config(self) -> dict[str, object]:
        return {
            "holidays": sorted(d.isoformat() for d in self.holidays),
            "weekend_policy": self.weekend_policy,
            "cycle_working_days": self.cycle_working_days,
            "cutoff_ist": self.cutoff_ist.isoformat(),
        }


def ist(
    year: int, month: int, day: int, hour: int = 0, minute: int = 0, second: int = 0
) -> datetime:
    """Construct an aware IST datetime (test/fixture helper)."""
    return datetime(year, month, day, hour, minute, second, tzinfo=IST)


def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        raise ValueError("naive datetime")
    return dt.astimezone(UTC)
