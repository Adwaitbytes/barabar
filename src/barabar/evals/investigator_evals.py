"""Investigator evals: run tier D over every open exception of the 600-order
month and score the proposed type against ground truth. Needs an API key once;
results are cached, so the report is regenerable for free afterwards."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, date, datetime
from pathlib import Path

from barabar.agent.investigator import (
    AgentCache,
    ClientLike,
    InvestigatorUnavailableError,
    investigate,
)
from barabar.core.config import MatchConfig
from barabar.core.matching import reconcile
from barabar.core.models import ExceptionStatus
from barabar.generator.engine import generate


def run_investigator_evals(
    *,
    seed: int = 42,
    n_orders: int = 600,
    limit: int = 40,
    client: ClientLike | None = None,
    cache: AgentCache | None = None,
    model: str | None = None,
) -> dict[str, object]:
    cfg = MatchConfig()
    g = generate(seed=seed, n_orders=n_orders)
    result = reconcile(g.month, cfg, "inv_evals")
    truth = g.truth.exception_map()
    open_items = [
        e
        for e in result.exceptions
        if e.status == ExceptionStatus.OPEN and e.confidence < cfg.auto_accept_threshold
    ][:limit]
    rows: list[dict[str, object]] = []
    hits = 0
    errors = 0
    for e in open_items:
        truth_type = next((truth[ent].value for ent in e.entities if ent in truth), e.type.value)
        try:
            card, cached, used_model = investigate(
                g.month, result, cfg, e.exc_id, client=client, cache=cache, model=model
            )
        except InvestigatorUnavailableError as exc:
            errors += 1
            rows.append(
                {
                    "exc_id": e.exc_id,
                    "matcher_type": e.type.value,
                    "truth_type": truth_type,
                    "proposed": None,
                    "correct": False,
                    "evidence": 0,
                    "error": str(exc),
                }
            )
            continue
        ok = card.type_proposed.value == truth_type
        hits += 1 if ok else 0
        rows.append(
            {
                "exc_id": e.exc_id,
                "matcher_type": e.type.value,
                "truth_type": truth_type,
                "proposed": card.type_proposed.value,
                "confidence": card.confidence,
                "correct": ok,
                "evidence": len(card.evidence),
                "cached": cached,
                "model": used_model,
                "alternative": card.alternative_rejected[:120],
            }
        )
    scored = len(open_items) - errors
    return {
        "n": len(open_items),
        "scored": scored,
        "errors": errors,
        "accuracy_pct": round(100.0 * hits / scored, 2) if scored else None,
        "by_type": dict(Counter(r["truth_type"] for r in rows)),
        "rows": rows,
    }  # type: ignore[misc]


def render(report: dict[str, object]) -> str:
    ts = datetime.now(tz=UTC).strftime("%Y-%m-%d %H:%M UTC")
    rows = report["rows"]  # type: ignore[assignment]
    out = [
        f"# Investigator evals: {ts}",
        "",
        f"Open, low-confidence exceptions investigated: **{report['n']}** · scored {report['scored']} · errors {report['errors']} · **hypothesis accuracy {report['accuracy_pct']}%** (PRD expectation: 70-85%, reported honestly).",
        "",
        "| Exception | Matcher type | Truth | Proposed | Conf | Evidence | OK |",
        "|---|---|---|---|---:|---:|:--:|",
    ]
    for r in rows:  # type: ignore[union-attr]
        out.append(
            f"| `{r['exc_id']}` | `{r['matcher_type']}` | `{r['truth_type']}` | `{r.get('proposed')}` | {r.get('confidence', '')} | {r.get('evidence', 0)} | {'✅' if r.get('correct') else '❌'} |"
        )
    return "\n".join(out) + "\n"


def write_report(report: dict[str, object], reports_dir: Path) -> Path:
    reports_dir.mkdir(parents=True, exist_ok=True)
    path = reports_dir / f"investigator-{date.today().isoformat()}.md"
    path.write_text(render(report), encoding="utf-8")
    (reports_dir / "investigator-latest.md").write_text(render(report), encoding="utf-8")
    return path
