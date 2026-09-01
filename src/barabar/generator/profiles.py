"""Merchant profiles: what a believable month looks like for each kind of business."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class MerchantProfile(StrEnum):
    D2C_FASHION = "d2c_fashion"
    SAAS = "saas"


@dataclass(frozen=True)
class ProfileSpec:
    method_weights: dict[str, float]
    median_rupees: int
    sigma: float
    min_rupees: int
    max_rupees: int
    paise_share: float  # share of amounts that are not whole rupees
    card_networks: dict[str, float]
    card_types: dict[str, float]


PROFILES: dict[MerchantProfile, ProfileSpec] = {
    MerchantProfile.D2C_FASHION: ProfileSpec(
        method_weights={"upi": 0.55, "card": 0.30, "netbanking": 0.08, "wallet": 0.07},
        median_rupees=1_499,
        sigma=0.6,
        min_rupees=99,
        max_rupees=25_000,
        paise_share=0.10,
        card_networks={"Visa": 0.50, "MasterCard": 0.35, "RuPay": 0.15},
        card_types={"credit": 0.55, "debit": 0.45},
    ),
    MerchantProfile.SAAS: ProfileSpec(
        method_weights={"card": 0.70, "netbanking": 0.20, "upi": 0.10},
        median_rupees=9_999,
        sigma=0.8,
        min_rupees=999,
        max_rupees=250_000,
        paise_share=0.35,
        card_networks={"Visa": 0.55, "MasterCard": 0.40, "RuPay": 0.05},
        card_types={"credit": 0.85, "debit": 0.15},
    ),
}
