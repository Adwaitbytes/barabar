"""The fault plan: every exception type is injected deliberately and counted, so
classification accuracy is measurable. Rates scale with ``n_orders``; absolute
counts do not."""

from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class FaultPlan:
    refund_rate: float = 0.03
    refund_partial_share: float = 0.5
    credit_note_share: float = 0.5
    dispute_rate: float = 0.004
    adjustments: int = 2
    partial_settlements: int = 1
    split_settlements: int = 1
    failed_retried: int = 1
    duplicate_bank_credits: int = 1
    missing_bank_credits: int = 1
    truncation_rate: float = 0.04
    truncation_len: int = 50
    demo_truncation_keep: int = 13  # one narration keeps 13 UTR chars -> C1 confidence 0.72
    orphan_ledger_rate: float = 0.015
    ledger_mismatch_rate: float = 0.01
    duplicate_ledger: int = 2
    fee_variance_rate: float = 0.005
    tax_variance: int = 1
    on_hold: int = 2
    instant_settlements: int = 1
    rounding_batches: int = 1
    unknown_bank_credits: int = 1
    pending_refunds: int = 1

    @classmethod
    def none(cls) -> FaultPlan:
        return cls(
            refund_rate=0.0,
            credit_note_share=1.0,
            dispute_rate=0.0,
            adjustments=0,
            partial_settlements=0,
            split_settlements=0,
            failed_retried=0,
            duplicate_bank_credits=0,
            missing_bank_credits=0,
            truncation_rate=0.0,
            orphan_ledger_rate=0.0,
            ledger_mismatch_rate=0.0,
            duplicate_ledger=0,
            fee_variance_rate=0.0,
            tax_variance=0,
            on_hold=0,
            instant_settlements=0,
            rounding_batches=0,
            unknown_bank_credits=0,
            pending_refunds=0,
        )

    def as_dict(self) -> dict[str, float | int]:
        return asdict(self)

    def count(self, rate: float, n: int) -> int:
        return 0 if rate <= 0 else max(1, round(rate * n))
