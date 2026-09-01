from datetime import date

import pytest
from hypothesis import given
from hypothesis import strategies as st

from barabar.core.utr import (
    IMPS_LEN,
    NEFT_LEN,
    RTGS_LEN,
    UtrKind,
    classify_utr,
    is_valid_utr,
    make_imps_rrn,
    make_neft_utr,
    make_rtgs_utr,
    utr_prefix_match,
)


def test_neft_shape() -> None:
    u = make_neft_utr("HDFC", date(2026, 8, 14), 4471)
    assert u == "HDFCN26226004471"
    assert len(u) == NEFT_LEN
    assert classify_utr(u) == UtrKind.NEFT


def test_rtgs_shape() -> None:
    u = make_rtgs_utr("ICIC", date(2026, 8, 14), 4471)
    assert u == "ICICRC2026081400004471"
    assert len(u) == RTGS_LEN
    assert classify_utr(u) == UtrKind.RTGS


def test_imps_shape() -> None:
    u = make_imps_rrn(622412345678)
    assert len(u) == IMPS_LEN
    assert classify_utr(u) == UtrKind.IMPS


@pytest.mark.parametrize(
    "bad", ["", "HDFCN2622600447", "hdfcn26226004471", "1568176960vxp0rj", "12345"]
)
def test_invalid(bad: str) -> None:
    assert not is_valid_utr(bad)


@given(
    st.sampled_from(["HDFC", "ICIC", "SBIN", "UTIB", "KKBK"]),
    st.dates(min_value=date(2020, 1, 1), max_value=date(2030, 12, 31)),
    st.integers(min_value=0, max_value=999_999),
)
def test_generated_neft_always_valid(bank: str, d: date, seq: int) -> None:
    assert classify_utr(make_neft_utr(bank, d, seq)) == UtrKind.NEFT


def test_prefix_match() -> None:
    full = "HDFCN26226004471"
    assert utr_prefix_match(full, full[:10]) == 10
    assert utr_prefix_match(full, full[:14]) == 14
    assert utr_prefix_match(full, full[:9]) == 0
    assert utr_prefix_match(full, "ICICN26226") == 0


def test_generator_validation() -> None:
    with pytest.raises(ValueError):
        make_neft_utr("HD", date(2026, 1, 1), 1)
    with pytest.raises(ValueError):
        make_rtgs_utr("HDFC", date(2026, 1, 1), 1, channel="CC")
