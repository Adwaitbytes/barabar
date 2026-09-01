"""Per-method rate card and the gross → fee → GST → net decomposition.

The first fee model assumed 2% on everything and produced hundreds of
FEE_VARIANCE false positives on UPI. Rates are per method (and per card
network/type for RuPay debit and international cards) — never a single number.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from barabar.core.money import GST_ON_FEE_BPS, apply_bps


class Method(StrEnum):
    """Razorpay ``payment.method`` values used by the rate card."""

    CARD = "card"
    UPI = "upi"
    NETBANKING = "netbanking"
    WALLET = "wallet"
    EMI = "emi"
    PAYLATER = "paylater"
    BANK_TRANSFER = "bank_transfer"


RUPAY_DEBIT_KEY = "rupay_debit"
INTL_CARD_KEY = "intl_card"

DEFAULT_RATES_BPS: dict[str, int] = {
    Method.CARD: 200,
    Method.NETBANKING: 200,
    Method.WALLET: 200,
    Method.EMI: 200,
    Method.PAYLATER: 200,
    Method.BANK_TRANSFER: 200,
    Method.UPI: 0,
    RUPAY_DEBIT_KEY: 0,
    INTL_CARD_KEY: 300,
}
"""Razorpay public pricing (Sept 2026): 2% + GST standard; UPI and RuPay debit are
zero-MDR by regulation; international cards 3%. Enterprise merchants override."""


@dataclass(frozen=True)
class FeeBreakdown:
    amount: int
    fee: int
    tax: int
    rate_bps: int
    rate_key: str

    @property
    def net(self) -> int:
        return self.amount - self.fee - self.tax


@dataclass(frozen=True)
class RateCard:
    rates_bps: dict[str, int] = field(default_factory=lambda: dict(DEFAULT_RATES_BPS))
    gst_bps: int = GST_ON_FEE_BPS

    @staticmethod
    def rate_key(
        method: str,
        *,
        card_network: str | None = None,
        card_type: str | None = None,
        international: bool = False,
    ) -> str:
        if method == Method.CARD:
            if international:
                return INTL_CARD_KEY
            if (card_network or "").lower() == "rupay" and (card_type or "").lower() == "debit":
                return RUPAY_DEBIT_KEY
        return method

    def rate_bps(self, method: str, **kw: object) -> int:
        key = self.rate_key(method, **kw)  # type: ignore[arg-type]
        if key not in self.rates_bps:
            raise KeyError(f"no rate for {key!r}")
        return self.rates_bps[key]

    def expected_fee(self, amount: int, method: str, **kw: object) -> int:
        return apply_bps(amount, self.rate_bps(method, **kw))

    def expected_tax(self, fee: int) -> int:
        return apply_bps(fee, self.gst_bps)

    def decompose(self, amount: int, method: str, **kw: object) -> FeeBreakdown:
        key = self.rate_key(method, **kw)  # type: ignore[arg-type]
        bps = self.rates_bps[key]
        fee = apply_bps(amount, bps)
        return FeeBreakdown(
            amount=amount, fee=fee, tax=self.expected_tax(fee), rate_bps=bps, rate_key=key
        )

    def config(self) -> dict[str, object]:
        return {"rates_bps": dict(sorted(self.rates_bps.items())), "gst_bps": self.gst_bps}
