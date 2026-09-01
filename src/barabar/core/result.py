"""Outputs of one reconciliation run: links, typed exceptions, proof trees,
metrics, audit events — and the canonical projection that becomes ``outputs_hash``."""

from __future__ import annotations

from datetime import date

from pydantic import Field

from barabar.core.audit import AuditEvent
from barabar.core.hashing import content_hash
from barabar.core.models import ExceptionItem, Frozen, MatchLink


class ProofNode(Frozen):
    kind: str  # bank | settlement | group | line | payment | refund | dispute | adjustment | note
    label: str
    entity: str | None = None
    amount: int | None = None
    rule_id: str | None = None
    confidence: float | None = None
    children: tuple[ProofNode, ...] = ()
    meta: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class ReconResult(Frozen):
    run_id: str
    as_of: date
    links: tuple[MatchLink, ...]
    exceptions: tuple[ExceptionItem, ...]
    proof_trees: dict[str, ProofNode]  # keyed by settlement_id
    metrics: dict[str, float | int | str]
    audit: tuple[AuditEvent, ...]

    def outputs_projection(self) -> dict[str, object]:
        """Everything that must be identical across replays. Excludes wall-clock
        fields (``created_at``, audit timestamps, throughput)."""
        return {
            "links": sorted(
                (
                    link.from_entity,
                    link.to_entity,
                    link.tier.value,
                    link.rule_id,
                    round(link.confidence, 4),
                    link.amount_matched,
                    link.residual,
                )
                for link in self.links
            ),
            "exceptions": sorted(
                (
                    exc.type.value,
                    exc.entities,
                    exc.amount,
                    round(exc.confidence, 4),
                    exc.status.value,
                    exc.reason_code,
                    exc.candidate_link.rule_id if exc.candidate_link else None,
                )
                for exc in self.exceptions
            ),
            "metrics": {k: v for k, v in self.metrics.items() if not k.startswith("throughput")},
        }

    def outputs_hash(self) -> str:
        return content_hash(self.outputs_projection())
