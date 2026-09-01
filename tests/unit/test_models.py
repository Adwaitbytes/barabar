from datetime import UTC, date, datetime

import pytest
from pydantic import ValidationError

from barabar.core.models import (
    EntityKind,
    Month,
    PaymentStatus,
    ReconLineType,
    RzPayment,
    RzReconLine,
    ref,
)


def _payment(**kw: object) -> RzPayment:
    base: dict[str, object] = dict(
        payment_id="pay_1",
        amount=100_000,
        fee=2_000,
        tax=360,
        method="card",
        captured_at=datetime(2026, 8, 12, 6, 0, tzinfo=UTC),
        created_at=datetime(2026, 8, 12, 6, 0, tzinfo=UTC),
        status=PaymentStatus.CAPTURED,
    )
    base.update(kw)
    return RzPayment(**base)  # type: ignore[arg-type]


def test_payment_net() -> None:
    assert _payment().net == 97_640


def test_naive_timestamp_rejected() -> None:
    with pytest.raises(ValidationError):
        _payment(captured_at=datetime(2026, 8, 12, 6, 0))


def test_float_amount_rejected() -> None:
    with pytest.raises(ValidationError):
        _payment(amount=1000.0)


def test_models_are_frozen() -> None:
    p = _payment()
    with pytest.raises(ValidationError):
        p.amount = 1  # type: ignore[misc]


def test_recon_line_net_is_signed() -> None:
    line = RzReconLine(
        entity_id="rfnd_1",
        type=ReconLineType.REFUND,
        settlement_id="setl_1",
        debit=5_000,
        credit=0,
        amount=5_000,
        fee=0,
        tax=0,
        created_at=datetime(2026, 8, 12, tzinfo=UTC),
    )
    assert line.net == -5_000


def test_month_gross_and_ref() -> None:
    m = Month(as_of=date(2026, 9, 1), payments=(_payment(), _payment(payment_id="pay_2")))
    assert m.gross_captured == 200_000
    assert ref(EntityKind.PAYMENT, "pay_1") == "payment:pay_1"
