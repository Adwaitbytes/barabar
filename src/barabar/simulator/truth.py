"""Ground truth emitted alongside simulated data, so evals compare against facts,
not against the matcher's own opinion."""

from __future__ import annotations

from barabar.core.exceptions import ExceptionType
from barabar.core.models import Frozen


class TruthLink(Frozen):
    from_entity: str
    to_entity: str


class TruthException(Frozen):
    type: ExceptionType
    primary_entity: str
    amount: int


class GroundTruth(Frozen):
    seed: int
    profile: str
    n_orders: int
    fault_plan: dict[str, float | int]
    gross_captured: int
    links: tuple[TruthLink, ...]
    exceptions: tuple[TruthException, ...]

    def link_pairs(self) -> set[tuple[str, str]]:
        return {(link.from_entity, link.to_entity) for link in self.links}

    def exception_map(self) -> dict[str, ExceptionType]:
        return {e.primary_entity: e.type for e in self.exceptions}
