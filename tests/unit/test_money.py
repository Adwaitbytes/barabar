import pytest
from hypothesis import given
from hypothesis import strategies as st

from barabar.core.money import (
    ROUNDING_POLICY,
    apply_bps,
    format_inr,
    parse_inr,
    round_half_up_div,
    rupees,
)


def test_policy_is_named() -> None:
    assert ROUNDING_POLICY == "ROUND_HALF_UP"


@pytest.mark.parametrize(
    ("num", "den", "expected"),
    [
        (0, 10, 0),
        (4, 10, 0),
        (5, 10, 1),  # .5 rounds up
        (15, 10, 2),  # 1.5 -> 2
        (25, 10, 3),  # 2.5 -> 3 (half-up, not banker's)
        (-5, 10, -1),  # half away from zero
        (-14, 10, -1),
        (-15, 10, -2),
        (200002, 10_000, 20),  # 20.0002 -> 20
        (12345 * 200, 10_000, 247),  # 246.9 -> 247
    ],
)
def test_round_half_up_div(num: int, den: int, expected: int) -> None:
    assert round_half_up_div(num, den) == expected


def test_round_half_up_div_rejects_bad_denominator() -> None:
    with pytest.raises(ValueError):
        round_half_up_div(1, 0)


@given(
    st.integers(min_value=-(10**12), max_value=10**12), st.integers(min_value=1, max_value=10**6)
)
def test_round_half_up_div_matches_decimal(num: int, den: int) -> None:
    from decimal import ROUND_HALF_UP, Decimal

    expected = int((Decimal(num) / Decimal(den)).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    assert round_half_up_div(num, den) == expected


def test_apply_bps_fee_and_tax_prd_example() -> None:
    # ₹1,000.00 at 2%: fee ₹20.00, GST ₹3.60
    assert apply_bps(100_000, 200) == 2_000
    assert apply_bps(2_000, 1800) == 360


def test_apply_bps_upi_is_zero() -> None:
    assert apply_bps(999_999, 0) == 0


@given(st.integers(min_value=0, max_value=10**11), st.integers(min_value=0, max_value=10_000))
def test_apply_bps_never_exceeds_amount(amount: int, bps: int) -> None:
    assert 0 <= apply_bps(amount, bps) <= amount


@pytest.mark.parametrize(
    ("text", "paise"),
    [
        ("1,83,412.37", 18_341_237),
        ("₹1,83,412", 18_341_200),
        ("Rs. 4200.00", 420_000),
        ("INR 12.5", 1_250),
        ("-4200", -420_000),
        ("(4,200.00)", -420_000),
        ("0.01", 1),
        ("  100  ", 10_000),
    ],
)
def test_parse_inr(text: str, paise: int) -> None:
    assert parse_inr(text) == paise


@pytest.mark.parametrize("text", ["", "abc", "1.234", "(12", "12)", "₹"])
def test_parse_inr_rejects(text: str) -> None:
    with pytest.raises(ValueError):
        parse_inr(text)


@pytest.mark.parametrize(
    ("paise", "text"),
    [
        (18_341_237, "₹1,83,412.37"),
        (100, "₹1.00"),
        (0, "₹0.00"),
        (99, "₹0.99"),
        (123_456_789_00, "₹12,34,56,789.00"),
        (-420_000, "-₹4,200.00"),
        (1_000_00, "₹1,000.00"),
    ],
)
def test_format_inr(paise: int, text: str) -> None:
    assert format_inr(paise) == text


@given(st.integers(min_value=-(10**13), max_value=10**13))
def test_format_parse_roundtrip(paise: int) -> None:
    assert parse_inr(format_inr(paise)) == paise
    assert parse_inr(format_inr(paise, symbol=False)) == paise


def test_rupees_helper() -> None:
    assert rupees(1_83_412, 37) == 18_341_237
    with pytest.raises(ValueError):
        rupees(1, 100)
