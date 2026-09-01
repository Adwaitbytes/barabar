import pytest

from barabar.core.ratecard import INTL_CARD_KEY, RUPAY_DEBIT_KEY, Method, RateCard


@pytest.fixture
def rc() -> RateCard:
    return RateCard()


def test_card_two_percent_plus_gst(rc: RateCard) -> None:
    fb = rc.decompose(100_000, Method.CARD)
    assert (fb.fee, fb.tax, fb.net) == (2_000, 360, 97_640)
    assert fb.rate_key == "card"


def test_upi_zero_mdr(rc: RateCard) -> None:
    fb = rc.decompose(123_456, Method.UPI)
    assert (fb.fee, fb.tax, fb.net) == (0, 0, 123_456)


def test_rupay_debit_is_zero_mdr(rc: RateCard) -> None:
    assert rc.rate_key(Method.CARD, card_network="RuPay", card_type="debit") == RUPAY_DEBIT_KEY
    assert rc.expected_fee(50_000, Method.CARD, card_network="RuPay", card_type="debit") == 0
    # RuPay credit is not zero-MDR
    assert rc.expected_fee(50_000, Method.CARD, card_network="RuPay", card_type="credit") == 1_000


def test_international_card(rc: RateCard) -> None:
    assert rc.rate_key(Method.CARD, international=True) == INTL_CARD_KEY
    assert rc.expected_fee(100_000, Method.CARD, international=True) == 3_000


def test_rounding_to_paise(rc: RateCard) -> None:
    fb = rc.decompose(12_345, Method.CARD)  # 246.9 -> 247; 44.46 -> 44
    assert (fb.fee, fb.tax, fb.net) == (247, 44, 12_054)


def test_prd_sample_totals_are_consistent() -> None:
    # Appendix C: gross ₹2,10,000, fee ₹3,420 -> GST ₹615.60
    assert RateCard().expected_tax(342_000) == 61_560


def test_custom_rate_card_and_config_hashable() -> None:
    custom = RateCard(rates_bps={**RateCard().rates_bps, Method.UPI: 50})
    assert custom.expected_fee(100_000, Method.UPI) == 500
    assert custom.config() != RateCard().config()
    assert RateCard().config() == RateCard().config()


def test_unknown_method_raises(rc: RateCard) -> None:
    with pytest.raises(KeyError):
        rc.rate_bps("crypto")
