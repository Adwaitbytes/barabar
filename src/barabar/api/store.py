"""Persistence: runs, months, results, exception state, audit chain, webhook
events. SQLite for the demo, Postgres in production, one code path via
SQLAlchemy Core. A run's lifecycle is staged (ingested → reconciled → finished)
and persisted at each stage, so a killed process resumes deterministically."""

from __future__ import annotations

import json
import os
from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    delete,
    insert,
    select,
    update,
)
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool

from barabar.core.audit import AuditChain, AuditEvent
from barabar.core.config import MatchConfig
from barabar.core.hashing import code_version, content_hash
from barabar.core.matching import reconcile
from barabar.core.models import ExceptionItem, ExceptionStatus, Month, Run
from barabar.core.result import ReconResult

metadata = MetaData()

runs = Table(
    "runs",
    metadata,
    Column("run_id", String(40), primary_key=True),
    Column("name", String(200)),
    Column("inputs_hash", String(64), nullable=False),
    Column("config_hash", String(64), nullable=False),
    Column("code_version", String(64), nullable=False),
    Column("outputs_hash", String(64)),
    Column("as_of", String(10), nullable=False),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("finished_at", DateTime(timezone=True)),
    Column("stage", String(20), nullable=False),
    Column("metrics", JSON, nullable=False, default=dict),
    Column("source", JSON, nullable=False, default=dict),
    Column("config", JSON, nullable=False, default=dict),
)
months = Table(
    "months",
    metadata,
    Column("inputs_hash", String(64), primary_key=True),
    Column("payload", Text, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)
results = Table(
    "results",
    metadata,
    Column("run_id", String(40), primary_key=True),
    Column("payload", Text, nullable=False),
)
exception_state = Table(
    "exception_state",
    metadata,
    Column("run_id", String(40), primary_key=True),
    Column("exc_id", String(40), primary_key=True),
    Column("status", String(20), nullable=False),
    Column("resolved_by", String(100)),
    Column("resolved_at", DateTime(timezone=True)),
    Column("note", Text),
    Column("accepted_link", JSON),
)
audit = Table(
    "audit",
    metadata,
    Column("seq", Integer, primary_key=True, autoincrement=True),
    Column("event_id", String(40), nullable=False, unique=True),
    Column("run_id", String(40)),
    Column("actor", String(100), nullable=False),
    Column("action", String(60), nullable=False),
    Column("target", Text, nullable=False),
    Column("rule_or_evidence", Text, nullable=False),
    Column("ts", DateTime(timezone=True), nullable=False),
    Column("prev_hash", String(64), nullable=False),
    Column("hash", String(64), nullable=False),
)
hypotheses = Table(
    "hypotheses",
    metadata,
    Column("run_id", String(40), primary_key=True),
    Column("exc_id", String(40), primary_key=True),
    Column("payload", JSON, nullable=False),
    Column("model", String(80), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)
webhook_events = Table(
    "webhook_events",
    metadata,
    Column("event_id", String(80), primary_key=True),
    Column("event", String(80), nullable=False),
    Column("payload", Text, nullable=False),
    Column("received_at", DateTime(timezone=True), nullable=False),
    Column("duplicate_count", Integer, nullable=False, default=0),
    Column("verified", Boolean, nullable=False, default=False),
)


def default_sqlite_url() -> str:
    """Local file by default; ``/tmp`` on read-only serverless filesystems (Vercel)."""
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return "sqlite:////tmp/barabar.db"
    return "sqlite:///./data/local/barabar.db"


_DEFAULT_CFG = MatchConfig()


def _now() -> datetime:
    return datetime.now(tz=UTC)


class Store:
    def __init__(self, url: str | None = None) -> None:
        url = url or os.environ.get("DATABASE_URL") or default_sqlite_url()
        if url.startswith("sqlite:///") and not url.endswith(":memory:"):
            os.makedirs(os.path.dirname(url.removeprefix("sqlite:///")) or ".", exist_ok=True)
        if url.startswith("postgresql://") or url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url.split("://", 1)[1]  # psycopg 3 driver
        memory = url in ("sqlite://", "sqlite:///:memory:")
        self.engine: Engine = create_engine(
            url,
            future=True,
            connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
            poolclass=StaticPool if memory else None,
            # Neon (and any pooled Postgres) drops idle SSL connections; check before reuse
            # and recycle every few minutes so a long-lived process never hands out a dead one.
            pool_pre_ping=not url.startswith("sqlite"),
            pool_recycle=300 if not url.startswith("sqlite") else -1,
        )
        metadata.create_all(self.engine)
        # Parsed objects are megabytes of JSON; a warm process must not re-read and
        # re-validate them for every request a page makes.
        self._results: dict[str, ReconResult] = {}
        self._months: dict[str, Month] = {}

    @staticmethod
    def _remember(cache: dict[str, Any], key: str, value: Any, cap: int = 8) -> None:
        cache[key] = value
        while len(cache) > cap:
            cache.pop(next(iter(cache)))

    # --- months ------------------------------------------------------------------

    def put_month(self, month: Month) -> str:
        h = content_hash(month)
        with self.engine.begin() as cx:
            if (
                cx.execute(select(months.c.inputs_hash).where(months.c.inputs_hash == h)).first()
                is None
            ):
                cx.execute(
                    insert(months).values(
                        inputs_hash=h, payload=month.model_dump_json(), created_at=_now()
                    )
                )
        return h

    def get_month(self, inputs_hash: str) -> Month:
        cached = self._months.get(inputs_hash)
        if cached is not None:
            return cached
        with self.engine.begin() as cx:
            row = cx.execute(
                select(months.c.payload).where(months.c.inputs_hash == inputs_hash)
            ).first()
        if row is None:
            raise KeyError(inputs_hash)
        month = Month.model_validate_json(row[0])
        self._remember(self._months, inputs_hash, month)
        return month

    # --- runs -----------------------------------------------------------------------

    def create_run(
        self, month: Month, cfg: MatchConfig, *, source: dict[str, Any], name: str | None = None
    ) -> Run:
        inputs_hash = self.put_month(month)
        run = Run(
            run_id=f"run_{uuid4().hex[:12]}",
            inputs_hash=inputs_hash,
            config_hash=cfg.config_hash(),
            code_version=code_version(),
            as_of=month.as_of,
            started_at=_now(),
            stage="ingested",
        )
        with self.engine.begin() as cx:
            cx.execute(
                insert(runs).values(
                    run_id=run.run_id,
                    name=name or f"{month.as_of.isoformat()} · {len(month.payments)} payments",
                    inputs_hash=inputs_hash,
                    config_hash=run.config_hash,
                    code_version=run.code_version,
                    as_of=month.as_of.isoformat(),
                    started_at=run.started_at,
                    stage="ingested",
                    metrics={},
                    source=source,
                    config=cfg.config_dict(),
                )
            )
        return run

    def reconcile_run(self, run_id: str, cfg: MatchConfig) -> ReconResult:
        run = self.get_run(run_id)
        month = self.get_month(run.inputs_hash)
        result = reconcile(month, cfg, run_id, clock=run.started_at)
        with self.engine.begin() as cx:
            cx.execute(delete(results).where(results.c.run_id == run_id))
            # The audit chain lives in its own table; keeping a second copy inside the
            # result payload made every read carry thousands of extra rows.
            cx.execute(
                insert(results).values(
                    run_id=run_id, payload=result.model_copy(update={"audit": ()}).model_dump_json()
                )
            )
            cx.execute(
                update(runs)
                .where(runs.c.run_id == run_id)
                .values(stage="reconciled", metrics=result.metrics)
            )
            cx.execute(delete(audit).where(audit.c.run_id == run_id))
            rows = [ev.model_dump() for ev in result.audit]
            for i in range(0, len(rows), 500):  # one round trip per 500 rows, not one per row
                cx.execute(insert(audit), rows[i : i + 500])
            cx.execute(
                update(runs)
                .where(runs.c.run_id == run_id)
                .values(stage="finished", outputs_hash=result.outputs_hash(), finished_at=_now())
            )
        self._remember(self._results, run_id, result)
        return result

    def resume_incomplete(self, cfg: MatchConfig) -> list[str]:
        """Kill-mid-run recovery: any run persisted before ``finished`` is re-driven
        from its stored inputs; determinism guarantees the same outputs_hash."""
        with self.engine.begin() as cx:
            pending = [
                r[0]
                for r in cx.execute(select(runs.c.run_id).where(runs.c.stage != "finished")).all()
            ]
        for run_id in pending:
            self.reconcile_run(run_id, cfg)
        return pending

    def get_run(self, run_id: str) -> Run:
        with self.engine.begin() as cx:
            row = cx.execute(select(runs).where(runs.c.run_id == run_id)).mappings().first()
        if row is None:
            raise KeyError(run_id)
        return Run(
            run_id=row["run_id"],
            inputs_hash=row["inputs_hash"],
            config_hash=row["config_hash"],
            code_version=row["code_version"],
            outputs_hash=row["outputs_hash"],
            as_of=date.fromisoformat(row["as_of"]),
            started_at=_aware(row["started_at"]),
            finished_at=_aware(row["finished_at"]) if row["finished_at"] else None,
            stage=row["stage"],
            metrics=row["metrics"] or {},
        )

    def run_meta(self, run_id: str) -> dict[str, Any]:
        with self.engine.begin() as cx:
            row = cx.execute(select(runs).where(runs.c.run_id == run_id)).mappings().first()
        if row is None:
            raise KeyError(run_id)
        return dict(row)

    def list_runs(self) -> list[dict[str, Any]]:
        with self.engine.begin() as cx:
            rows = cx.execute(select(runs).order_by(runs.c.started_at.desc())).mappings().all()
        return [dict(r) for r in rows]

    def delete_run(self, run_id: str) -> None:
        with self.engine.begin() as cx:
            for t in (results, exception_state, audit):
                cx.execute(delete(t).where(t.c.run_id == run_id))
            cx.execute(delete(runs).where(runs.c.run_id == run_id))
        self._results.pop(run_id, None)

    # --- results + exception state ---------------------------------------------------

    def get_result(self, run_id: str, cfg: MatchConfig | None = None) -> ReconResult:
        """The stored result; if the run was interrupted before its result landed and a
        config is given, finish it now - determinism makes that the same run."""
        base = self._results.get(run_id)
        with self.engine.begin() as cx:
            row = (
                None
                if base is not None
                else cx.execute(select(results.c.payload).where(results.c.run_id == run_id)).first()
            )
            states = (
                cx.execute(select(exception_state).where(exception_state.c.run_id == run_id))
                .mappings()
                .all()
            )
        if base is None and row is None:
            if cfg is None:
                raise KeyError(run_id)
            self.get_run(run_id)  # raises KeyError if the run itself is unknown
            self.reconcile_run(run_id, cfg)
            return self.get_result(run_id)
        result = base if base is not None else ReconResult.model_validate_json(row[0])  # type: ignore[index]
        if base is None:
            self._remember(self._results, run_id, result)
        if not states:
            return result
        overlay = {st["exc_id"]: st for st in states}
        patched = tuple(
            e.model_copy(
                update={
                    "status": ExceptionStatus(overlay[e.exc_id]["status"]),
                    "resolved_by": overlay[e.exc_id]["resolved_by"],
                    "resolved_at": _aware(overlay[e.exc_id]["resolved_at"])
                    if overlay[e.exc_id]["resolved_at"]
                    else None,
                    "resolution_note": overlay[e.exc_id]["note"],
                }
            )
            if e.exc_id in overlay
            else e
            for e in result.exceptions
        )
        return result.model_copy(update={"exceptions": patched})

    def set_exception_status(
        self,
        run_id: str,
        exc_id: str,
        status: ExceptionStatus,
        *,
        actor: str,
        note: str | None,
        accepted_link: dict[str, Any] | None = None,
    ) -> ExceptionItem:
        result = self.get_result(run_id, _DEFAULT_CFG)
        item = next((e for e in result.exceptions if e.exc_id == exc_id), None)
        if item is None:
            raise KeyError(exc_id)
        now = _now()
        with self.engine.begin() as cx:
            cx.execute(
                delete(exception_state).where(
                    exception_state.c.run_id == run_id, exception_state.c.exc_id == exc_id
                )
            )
            cx.execute(
                insert(exception_state).values(
                    run_id=run_id,
                    exc_id=exc_id,
                    status=status.value,
                    resolved_by=actor,
                    resolved_at=now,
                    note=note,
                    accepted_link=accepted_link,
                )
            )
        self.append_audit(
            run_id,
            actor=actor,
            action=f"exception.{status.value}",
            target=exc_id,
            rule_or_evidence=note or "(no note)",
        )
        return item.model_copy(
            update={
                "status": status,
                "resolved_by": actor,
                "resolved_at": now,
                "resolution_note": note,
            }
        )

    # --- hypotheses ----------------------------------------------------------------------

    def put_hypothesis(self, run_id: str, exc_id: str, payload: dict[str, Any], model: str) -> None:
        with self.engine.begin() as cx:
            cx.execute(
                delete(hypotheses).where(
                    hypotheses.c.run_id == run_id, hypotheses.c.exc_id == exc_id
                )
            )
            cx.execute(
                insert(hypotheses).values(
                    run_id=run_id, exc_id=exc_id, payload=payload, model=model, created_at=_now()
                )
            )

    def get_hypothesis(self, run_id: str, exc_id: str) -> dict[str, Any] | None:
        with self.engine.begin() as cx:
            row = cx.execute(
                select(hypotheses.c.payload, hypotheses.c.model).where(
                    hypotheses.c.run_id == run_id, hypotheses.c.exc_id == exc_id
                )
            ).first()
        return {"hypothesis": row[0], "model": row[1]} if row else None

    # --- audit ------------------------------------------------------------------------------

    def audit_chain(self, run_id: str) -> AuditChain:
        with self.engine.begin() as cx:
            rows = (
                cx.execute(select(audit).where(audit.c.run_id == run_id).order_by(audit.c.seq))
                .mappings()
                .all()
            )
        events = [
            AuditEvent(
                event_id=str(r["event_id"]),
                run_id=r["run_id"],
                actor=str(r["actor"]),
                action=str(r["action"]),
                target=str(r["target"]),
                rule_or_evidence=str(r["rule_or_evidence"]),
                ts=_aware(r["ts"]),
                prev_hash=str(r["prev_hash"]),
                hash=str(r["hash"]),
            )
            for r in rows
        ]
        return AuditChain.from_events(events)

    def append_audit(
        self, run_id: str | None, *, actor: str, action: str, target: str, rule_or_evidence: str
    ) -> AuditEvent:
        chain = self.audit_chain(run_id) if run_id else AuditChain()
        ev = chain.append(
            actor=actor,
            action=action,
            target=target,
            rule_or_evidence=rule_or_evidence,
            run_id=run_id,
        )
        with self.engine.begin() as cx:
            cx.execute(insert(audit).values(**ev.model_dump()))
        return ev

    # --- webhooks ------------------------------------------------------------------------------

    def record_webhook(
        self, event_id: str, event: str, payload: dict[str, Any], *, verified: bool
    ) -> tuple[bool, int]:
        """Returns (is_new, duplicate_count). Replaying the same event 100 times
        yields one row and 99 duplicate audit lines."""
        with self.engine.begin() as cx:
            row = cx.execute(
                select(webhook_events.c.duplicate_count).where(
                    webhook_events.c.event_id == event_id
                )
            ).first()
            if row is None:
                cx.execute(
                    insert(webhook_events).values(
                        event_id=event_id,
                        event=event,
                        payload=json.dumps(payload),
                        received_at=_now(),
                        duplicate_count=0,
                        verified=verified,
                    )
                )
                is_new, dupes = True, 0
            else:
                dupes = int(row[0]) + 1
                cx.execute(
                    update(webhook_events)
                    .where(webhook_events.c.event_id == event_id)
                    .values(duplicate_count=dupes)
                )
                is_new = False
        self.append_audit(
            None,
            actor="system",
            action="webhook.received" if is_new else "webhook.duplicate_ignored",
            target=event_id,
            rule_or_evidence=f"{event} verified={verified}",
        )
        return is_new, dupes

    def webhook_stats(self) -> dict[str, int]:
        with self.engine.begin() as cx:
            rows = cx.execute(select(webhook_events.c.duplicate_count)).all()
        return {"events": len(rows), "duplicates_ignored": sum(int(r[0]) for r in rows)}


def _aware(dt: datetime | None) -> datetime:
    if dt is None:
        raise ValueError("missing timestamp")
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
