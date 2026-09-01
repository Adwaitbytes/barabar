from datetime import UTC, datetime
from enum import StrEnum

import pytest
from pydantic import BaseModel

from barabar.core.audit import GENESIS_HASH, AuditChain
from barabar.core.hashing import canonical_json, code_version, content_hash


class Colour(StrEnum):
    RED = "red"


class M(BaseModel):
    a: int
    b: str


def test_canonical_json_key_order_independent() -> None:
    assert canonical_json({"b": 1, "a": 2}) == canonical_json({"a": 2, "b": 1})
    assert canonical_json({"b": 1, "a": 2}) == b'{"a":2,"b":1}'


def test_canonical_json_types() -> None:
    dt = datetime(2026, 8, 14, 6, 12, tzinfo=UTC)
    out = canonical_json({"dt": dt, "e": Colour.RED, "m": M(a=1, b="x"), "s": {3, 1, 2}})
    assert out == b'{"dt":"2026-08-14T06:12:00+00:00","e":"red","m":{"a":1,"b":"x"},"s":[1,2,3]}'


def test_naive_datetime_rejected() -> None:
    with pytest.raises(TypeError):
        canonical_json({"dt": datetime(2026, 1, 1)})


def test_content_hash_stable() -> None:
    assert content_hash({"x": [1, 2]}) == content_hash({"x": [1, 2]})
    assert content_hash({"x": [1, 2]}) != content_hash({"x": [2, 1]})
    assert len(content_hash({})) == 64


def test_code_version_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BARABAR_CODE_VERSION", "v-test")
    assert code_version() == "v-test"


def test_audit_chain_links_and_verifies() -> None:
    chain = AuditChain()
    assert chain.head == GENESIS_HASH
    e1 = chain.append(
        actor="system", action="match.link", target="bank:1", rule_or_evidence="A1-UTR-EXACT"
    )
    e2 = chain.append(
        actor="user:cfo", action="exception.resolve", target="exc:9", rule_or_evidence="note"
    )
    assert e1.prev_hash == GENESIS_HASH
    assert e2.prev_hash == e1.hash
    assert chain.verify() is True
    assert AuditChain.from_events(chain.events).head == e2.hash


def test_audit_chain_detects_tampering() -> None:
    chain = AuditChain()
    chain.append(actor="system", action="a", target="t", rule_or_evidence="r")
    chain.append(actor="system", action="b", target="t", rule_or_evidence="r")
    tampered = chain.events[0].model_copy(update={"action": "z"})
    with pytest.raises(ValueError):
        AuditChain.from_events([tampered, chain.events[1]])
