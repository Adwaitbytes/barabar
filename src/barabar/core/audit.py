"""Append-only, hash-chained audit events. Every match, exception, LLM proposal and
human click lands here with the rule ID or evidence that produced it."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from barabar.core.hashing import canonical_json, sha256_hex

GENESIS_HASH = "0" * 64

Actor = str  # "system" | "agent" | "user:<id>"


class AuditEvent(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    event_id: str
    run_id: str | None
    actor: Actor
    action: str
    target: str
    rule_or_evidence: str
    ts: datetime
    prev_hash: str
    hash: str

    @staticmethod
    def compute_hash(prev_hash: str, body: dict[str, object]) -> str:
        return sha256_hex(prev_hash.encode() + canonical_json(body))


class AuditChain(BaseModel):
    """In-memory chain; persistence is the store's job (append-only table)."""

    model_config = ConfigDict(extra="forbid")

    events: list[AuditEvent] = Field(default_factory=list)

    @property
    def head(self) -> str:
        return self.events[-1].hash if self.events else GENESIS_HASH

    def append(
        self,
        *,
        actor: Actor,
        action: str,
        target: str,
        rule_or_evidence: str,
        run_id: str | None = None,
        ts: datetime | None = None,
        event_id: str | None = None,
    ) -> AuditEvent:
        body: dict[str, object] = {
            "event_id": event_id or f"aud_{uuid4().hex[:16]}",
            "run_id": run_id,
            "actor": actor,
            "action": action,
            "target": target,
            "rule_or_evidence": rule_or_evidence,
            "ts": ts or datetime.now(tz=UTC),
        }
        prev = self.head
        ev = AuditEvent(**body, prev_hash=prev, hash=AuditEvent.compute_hash(prev, body))  # type: ignore[arg-type]
        self.events.append(ev)
        return ev

    def verify(self) -> Literal[True]:
        prev = GENESIS_HASH
        for ev in self.events:
            body = ev.model_dump(exclude={"prev_hash", "hash"})
            if ev.prev_hash != prev or ev.hash != AuditEvent.compute_hash(prev, body):
                raise ValueError(f"audit chain broken at {ev.event_id}")
            prev = ev.hash
        return True

    @classmethod
    def from_events(cls, events: Iterable[AuditEvent]) -> AuditChain:
        chain = cls(events=list(events))
        chain.verify()
        return chain
