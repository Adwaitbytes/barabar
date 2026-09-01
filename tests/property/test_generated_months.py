from datetime import date

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from barabar.core.config import MatchConfig
from barabar.core.exceptions import V1_TYPES, ExceptionType
from barabar.core.matching import reconcile
from barabar.core.models import ExceptionStatus, SettlementStatus, Tier
from barabar.generator.engine import generate
from barabar.generator.faults import FaultPlan
from barabar.generator.profiles import MerchantProfile

CFG = MatchConfig()


def _auto_pairs(result) -> set[tuple[str, str]]:  # type: ignore[no-untyped-def]
    return {
        (link.from_entity, link.to_entity)
        for link in result.links
        if link.tier in (Tier.A, Tier.B) or link.confidence >= CFG.auto_accept_threshold
    }


@settings(max_examples=12, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    st.integers(min_value=1, max_value=10_000),
    st.sampled_from(list(MerchantProfile)),
    st.integers(min_value=20, max_value=150),
)
def test_no_fault_month_matches_everything(seed: int, profile: MerchantProfile, n: int) -> None:
    g = generate(
        seed=seed, profile=profile, n_orders=n, faults=FaultPlan.none(), as_of=date(2026, 9, 15)
    )
    r = reconcile(g.month, CFG, "run")
    auto = _auto_pairs(r)
    truth = g.truth.link_pairs()
    assert truth <= auto, f"missed {len(truth - auto)} truth links: {sorted(truth - auto)[:3]}"
    assert auto <= truth, f"{len(auto - truth)} false links: {sorted(auto - truth)[:3]}"
    assert all(
        e.type == ExceptionType.TIMING_HOLIDAY_SHIFT and e.status == ExceptionStatus.AUTO_RESOLVED
        for e in r.exceptions
    ), sorted({e.type for e in r.exceptions})
    assert r.metrics["unexplained_paise"] == 0
    assert r.metrics["settlements_matched_to_bank"] == sum(
        1 for s in g.month.settlements if s.status == SettlementStatus.PROCESSED
    )


@settings(max_examples=8, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(st.integers(min_value=1, max_value=10_000), st.integers(min_value=60, max_value=200))
def test_conservation_of_rupees(seed: int, n: int) -> None:
    g = generate(seed=seed, n_orders=n)
    r = reconcile(g.month, CFG, "run")
    assert r.metrics["explained_paise"] + r.metrics["unexplained_paise"] == g.month.gross_captured
    lines_by_setl: dict[str, int] = {}
    for ln in g.month.recon_lines:
        if ln.settlement_id and ln.settled and not ln.on_hold:
            lines_by_setl[ln.settlement_id] = (
                lines_by_setl.get(ln.settlement_id, 0) + ln.credit - ln.debit
            )
    for s in g.month.settlements:
        if s.status == SettlementStatus.PROCESSED:
            assert abs(lines_by_setl.get(s.settlement_id, 0) - s.amount) <= 3, s.settlement_id


def test_default_600_month_contains_every_v1_type_and_is_deterministic() -> None:
    g1 = generate(seed=42, n_orders=600)
    g2 = generate(seed=42, n_orders=600)
    assert g1.month == g2.month and g1.truth == g2.truth
    present = {t.type for t in g1.truth.exceptions}
    missing = V1_TYPES - present
    assert not missing, f"fault plan does not inject: {sorted(missing)}"
    r = reconcile(g1.month, CFG, "run")
    found = {e.type for e in r.exceptions}
    assert found >= V1_TYPES, f"matcher never emitted: {sorted(V1_TYPES - found)}"


def test_truth_and_matcher_agree_on_the_600_month() -> None:
    g = generate(seed=42, n_orders=600)
    r = reconcile(g.month, CFG, "run")
    auto, truth = _auto_pairs(r), g.truth.link_pairs()
    false_links = auto - truth
    assert not false_links, f"false auto links: {sorted(false_links)[:5]}"
    recall = len(auto & truth) / len(truth)
    assert recall >= 0.97, recall
    by_entity = {}
    for e in r.exceptions:
        for ent in e.entities:
            by_entity.setdefault(ent, e.type)
    tm = g.truth.exception_map()
    hits = sum(1 for ent, t in tm.items() if by_entity.get(ent) == t)
    acc = hits / len(tm)
    assert acc >= 0.95, (
        acc,
        [(ent, t, by_entity.get(ent)) for ent, t in tm.items() if by_entity.get(ent) != t][:8],
    )


@pytest.mark.perf
def test_throughput_6000_under_ten_seconds() -> None:
    import time

    g = generate(seed=7, n_orders=6000)
    t0 = time.perf_counter()
    reconcile(g.month, CFG, "run")
    assert time.perf_counter() - t0 < 10


@pytest.mark.perf
def test_throughput_60000_under_ninety_seconds() -> None:
    import time

    g = generate(seed=7, n_orders=60000)
    t0 = time.perf_counter()
    reconcile(g.month, CFG, "run")
    assert time.perf_counter() - t0 < 90
