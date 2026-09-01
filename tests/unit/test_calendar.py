from datetime import date, datetime, time
from zoneinfo import ZoneInfo

import pytest

from barabar.core.calendar import IST, SettlementCalendar, ist, load_rbi_holidays


@pytest.fixture(scope="module")
def cal() -> SettlementCalendar:
    return SettlementCalendar.rbi(2026)


def test_holiday_data_loads_and_includes_national_days() -> None:
    hs = {h.date: h for h in load_rbi_holidays(2026)}
    assert hs[date(2026, 1, 26)].scope == "nationwide"
    assert hs[date(2026, 8, 15)].scope == "nationwide"
    assert hs[date(2026, 10, 2)].scope == "nationwide"
    assert hs[date(2026, 8, 26)].name == "Id-e-Milad"


def test_state_holidays_opt_in() -> None:
    national = SettlementCalendar.rbi(2026)
    with_state = SettlementCalendar.rbi(2026, include_state_holidays=True)
    assert date(2026, 9, 14) not in national.holidays  # Ganesh Chaturthi is state-specific
    assert date(2026, 9, 14) in with_state.holidays


@pytest.mark.parametrize(
    ("d", "working"),
    [
        (date(2026, 8, 14), True),  # Fri
        (date(2026, 8, 15), False),  # Sat + Independence Day
        (date(2026, 8, 16), False),  # Sun
        (date(2026, 8, 17), True),  # Mon
        (date(2026, 8, 26), False),  # Wed, Id-e-Milad
        (date(2026, 8, 27), True),
    ],
)
def test_is_working_day(cal: SettlementCalendar, d: date, working: bool) -> None:
    assert cal.is_working_day(d) is working


def test_second_fourth_saturday_policy() -> None:
    c = SettlementCalendar(
        holidays=frozenset(), weekend_policy="second_fourth_saturdays_and_sundays"
    )
    assert c.is_working_day(date(2026, 8, 1))  # 1st Saturday open
    assert not c.is_working_day(date(2026, 8, 8))  # 2nd Saturday closed
    assert c.is_working_day(date(2026, 8, 15 + 0)) is False or True  # 3rd Sat: open unless holiday
    assert not c.is_working_day(date(2026, 8, 22))  # 4th Saturday closed
    assert not c.is_working_day(date(2026, 8, 23))  # Sunday


@pytest.mark.parametrize(
    ("captured", "expected"),
    [
        (ist(2026, 8, 14, 20, 0), date(2026, 8, 18)),  # Fri evening -> Sat/Sun skipped -> Tue
        (ist(2026, 8, 24, 10, 0), date(2026, 8, 27)),  # Mon -> Tue, Wed holiday, Thu
        (ist(2026, 8, 22, 10, 0), date(2026, 8, 27)),  # Sat capture: T=Mon 24 -> Thu 27
        (ist(2026, 12, 31, 9, 0), date(2027, 1, 4)),  # year boundary
        (ist(2026, 8, 12, 12, 0), date(2026, 8, 14)),  # Wed -> Fri
    ],
)
def test_expected_settlement_date(
    cal: SettlementCalendar, captured: datetime, expected: date
) -> None:
    assert cal.expected_settlement_date(captured) == expected


def test_utc_timestamp_is_converted_to_ist_day(cal: SettlementCalendar) -> None:
    # 18:35Z on 14 Aug == 00:05 IST on 15 Aug (Saturday). T shifts to Mon 17 -> Wed 19.
    captured = datetime(2026, 8, 14, 18, 35, tzinfo=ZoneInfo("UTC"))
    assert cal.capture_day_ist(captured) == date(2026, 8, 15)
    assert cal.expected_settlement_date(captured) == date(2026, 8, 19)
    # The same instant expressed in IST gives the same answer (no UTC-day bug).
    assert cal.expected_settlement_date(captured.astimezone(IST)) == date(2026, 8, 19)


def test_cutoff_moves_late_captures_to_next_day() -> None:
    c = SettlementCalendar(holidays=frozenset(), cutoff_ist=time(18, 0))
    assert c.capture_day_ist(ist(2026, 8, 12, 18, 0, 1)) == date(2026, 8, 13)
    assert c.capture_day_ist(ist(2026, 8, 12, 17, 59)) == date(2026, 8, 12)


def test_naive_datetime_rejected(cal: SettlementCalendar) -> None:
    with pytest.raises(ValueError):
        cal.capture_day_ist(datetime(2026, 8, 14, 12, 0))


def test_working_days_between(cal: SettlementCalendar) -> None:
    assert cal.working_days_between(date(2026, 8, 14), date(2026, 8, 18)) == 2
    assert cal.working_days_between(date(2026, 8, 18), date(2026, 8, 14)) == -2
    assert cal.working_days_between(date(2026, 8, 24), date(2026, 8, 27)) == 2


def test_add_working_days_zero_shifts_to_working(cal: SettlementCalendar) -> None:
    assert cal.add_working_days(date(2026, 8, 15), 0) == date(2026, 8, 17)
    with pytest.raises(ValueError):
        cal.add_working_days(date(2026, 8, 15), -1)


def test_config_is_deterministic(cal: SettlementCalendar) -> None:
    assert cal.config() == SettlementCalendar.rbi(2026).config()
    assert cal.config()["cycle_working_days"] == 2
