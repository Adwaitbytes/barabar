import re

from barabar.core.ids import IdGen


def test_ids_are_deterministic_and_razorpay_shaped() -> None:
    a, b = IdGen(7), IdGen(7)
    ids = [a.payment(), a.settlement(), a.refund()]
    assert ids == [b.payment(), b.settlement(), b.refund()]
    assert all(re.match(r"^(pay|setl|rfnd)_[A-Za-z0-9]{14}$", i) for i in ids)
    assert IdGen(8).payment() != IdGen(7).payment()
