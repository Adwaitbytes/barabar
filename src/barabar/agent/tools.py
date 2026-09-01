"""The investigator's tool belt: read-only views over a run. No tool here can
mutate anything; acceptance of a hypothesis is a human action in the API. Every
call returns canonical JSON and is hashed, so a hypothesis card cites evidence
that can be re-verified later."""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import date, datetime
from typing import Any

from barabar.core.calendar import IST, SettlementCalendar
from barabar.core.config import MatchConfig
from barabar.core.hashing import canonical_json, sha256_hex
from barabar.core.models import Evidence, ExceptionStatus, Month
from barabar.core.money import apply_bps, format_inr
from barabar.core.result import ProofNode, ReconResult

ToolFn = Callable[..., Any]


def _iso(dt: datetime | None) -> str | None:
    return dt.astimezone(IST).isoformat() if dt else None


class ToolBelt:
    def __init__(self, month: Month, result: ReconResult, cfg: MatchConfig) -> None:
        self.month = month
        self.result = result
        self.cfg = cfg
        self.calls: list[Evidence] = []
        self.numbers_seen: set[int] = set()
        self._settlements = {s.settlement_id: s for s in month.settlements}
        self._payments = {p.payment_id: p for p in month.payments}
        self._disputes = {d.dispute_id: d for d in month.disputes}
        self._exceptions = {e.exc_id: e for e in result.exceptions}
        self._bank = {t.bank_txn_id: t for t in month.bank_txns}
        self._ledger = {e.ledger_id: e for e in month.ledger}

    # --- registry ----------------------------------------------------------------------

    def schemas(self) -> list[dict[str, Any]]:
        return [dict(t) for t in TOOL_SCHEMAS]

    def call(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        fn: ToolFn | None = getattr(self, f"tool_{name}", None)
        if fn is None:
            return {"error": f"unknown tool {name}"}
        try:
            out = fn(**args)
        except (KeyError, ValueError, TypeError) as exc:
            out = {"error": f"{type(exc).__name__}: {exc}"}
        payload = canonical_json(out)
        self._collect_numbers(out)
        self.calls.append(
            Evidence(
                kind="tool_call",
                ref=f"{name}({json.dumps(args, sort_keys=True)})",
                summary=_summary(name, out),
                result_hash=sha256_hex(payload),
            )
        )
        return out

    def _collect_numbers(self, obj: Any) -> None:
        if isinstance(obj, bool):
            return
        if isinstance(obj, int):
            self.numbers_seen.add(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                self._collect_numbers(v)
        elif isinstance(obj, (list, tuple)):
            for v in obj:
                self._collect_numbers(v)

    # --- tools ---------------------------------------------------------------------------

    def tool_get_exception(self, exc_id: str) -> dict[str, Any]:
        e = self._exceptions[exc_id]
        return {
            "exc_id": e.exc_id,
            "type": e.type.value,
            "amount": e.amount,
            "amount_display": format_inr(e.amount),
            "confidence": e.confidence,
            "status": e.status.value,
            "entities": list(e.entities),
            "reason": e.reason_text,
            "suggested_action": e.suggested_action,
            "candidate": {
                "rule_id": e.candidate_link.rule_id,
                "confidence": e.candidate_link.confidence,
                "from": e.candidate_link.from_entity,
                "to": e.candidate_link.to_entity,
            }
            if e.candidate_link
            else None,
        }

    def tool_list_open_exceptions(self, limit: int = 20) -> dict[str, Any]:
        items = [e for e in self.result.exceptions if e.status == ExceptionStatus.OPEN]
        return {
            "count": len(items),
            "items": [
                {
                    "exc_id": e.exc_id,
                    "type": e.type.value,
                    "amount": e.amount,
                    "reason": e.reason_text,
                }
                for e in items[:limit]
            ],
        }

    def tool_get_settlement(self, settlement_id: str) -> dict[str, Any]:
        s = self._settlements[settlement_id]
        return {
            "settlement_id": s.settlement_id,
            "amount": s.amount,
            "amount_display": format_inr(s.amount),
            "fees": s.fees,
            "tax": s.tax,
            "utr": s.utr,
            "status": s.status.value,
            "type": s.type.value,
            "mode": s.mode.value,
            "settled_at": _iso(s.settled_at),
            "continuation_of": s.continuation_of,
            "retry_of": s.retry_of,
            "bank_links": [
                {
                    "bank_txn_id": link.from_entity.split(":", 1)[1],
                    "rule_id": link.rule_id,
                    "confidence": link.confidence,
                }
                for link in self.result.links
                if link.to_entity == f"settlement:{settlement_id}"
                and link.from_entity.startswith("bank:")
            ],
        }

    def tool_get_recon_lines(self, settlement_id: str) -> dict[str, Any]:
        lines = [ln for ln in self.month.recon_lines if ln.settlement_id == settlement_id]
        net = sum(ln.credit - ln.debit for ln in lines if ln.settled and not ln.on_hold)
        return {
            "settlement_id": settlement_id,
            "count": len(lines),
            "net": net,
            "net_display": format_inr(net),
            "gross": sum(ln.amount for ln in lines if ln.type.value == "payment"),
            "fee": sum(ln.fee for ln in lines),
            "tax": sum(ln.tax for ln in lines),
            "lines": [
                {
                    "entity_id": ln.entity_id,
                    "type": ln.type.value,
                    "amount": ln.amount,
                    "fee": ln.fee,
                    "tax": ln.tax,
                    "credit": ln.credit,
                    "debit": ln.debit,
                    "on_hold": ln.on_hold,
                    "dispute_id": ln.dispute_id,
                    "description": ln.description,
                    "method": ln.method,
                }
                for ln in lines[:200]
            ],
        }

    def tool_get_payment(self, payment_id: str) -> dict[str, Any]:
        p = self._payments[payment_id]
        return {
            "payment_id": p.payment_id,
            "amount": p.amount,
            "amount_display": format_inr(p.amount),
            "fee": p.fee,
            "tax": p.tax,
            "net": p.net,
            "method": p.method,
            "card_network": p.card_network,
            "card_type": p.card_type,
            "captured_at": _iso(p.captured_at),
            "order_receipt": p.order_receipt,
            "status": p.status.value,
            "expected_settlement_date": self.cfg.calendar.expected_settlement_date(
                p.captured_at
            ).isoformat()
            if p.captured_at
            else None,
        }

    def tool_get_refunds(self, payment_id: str) -> dict[str, Any]:
        rs = [r for r in self.month.refunds if r.payment_id == payment_id]
        return {
            "payment_id": payment_id,
            "count": len(rs),
            "refunds": [
                {
                    "refund_id": r.refund_id,
                    "amount": r.amount,
                    "status": r.status.value,
                    "processed_at": _iso(r.processed_at),
                }
                for r in rs
            ],
        }

    def tool_get_dispute(self, dispute_id: str) -> dict[str, Any]:
        d = self._disputes[dispute_id]
        return {
            "dispute_id": d.dispute_id,
            "payment_id": d.payment_id,
            "amount": d.amount,
            "phase": d.phase.value,
            "status": d.status.value,
            "respond_by": _iso(d.respond_by),
            "created_at": _iso(d.created_at),
        }

    def tool_search_bank(
        self,
        amount: int | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        narration_like: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        lo = date.fromisoformat(date_from) if date_from else None
        hi = date.fromisoformat(date_to) if date_to else None
        needle = (narration_like or "").upper()
        hits = [
            t
            for t in self.month.bank_txns
            if (amount is None or t.credit == amount or t.debit == amount)
            and (lo is None or t.value_date >= lo)
            and (hi is None or t.value_date <= hi)
            and (not needle or needle in t.narration_raw.upper())
        ]
        return {
            "count": len(hits),
            "rows": [
                {
                    "bank_txn_id": t.bank_txn_id,
                    "value_date": t.value_date.isoformat(),
                    "credit": t.credit,
                    "debit": t.debit,
                    "narration": t.narration_raw,
                    "utr_full": t.narration.utr_full if t.narration else None,
                    "utr_prefix": t.narration.utr_prefix if t.narration else None,
                    "razorpay_like": bool(t.narration and t.narration.razorpay_like),
                }
                for t in hits[:limit]
            ],
        }

    def tool_search_ledger(
        self,
        amount: int | None = None,
        invoice_like: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        lo = date.fromisoformat(date_from) if date_from else None
        hi = date.fromisoformat(date_to) if date_to else None
        needle = (invoice_like or "").upper()
        hits = [
            e
            for e in self.month.ledger
            if (amount is None or e.gross == amount)
            and (lo is None or e.date >= lo)
            and (hi is None or e.date <= hi)
            and (not needle or needle in e.invoice_no.upper())
        ]
        return {
            "count": len(hits),
            "rows": [
                {
                    "ledger_id": e.ledger_id,
                    "invoice_no": e.invoice_no,
                    "date": e.date.isoformat(),
                    "gross": e.gross,
                    "order_receipt": e.order_receipt,
                    "payment_ref": e.payment_ref,
                    "status": e.status.value,
                    "notes": e.notes,
                }
                for e in hits[:limit]
            ],
        }

    def tool_calendar_shift(self, on: str, working_days: int = 0) -> dict[str, Any]:
        cal: SettlementCalendar = self.cfg.calendar
        d = date.fromisoformat(on)
        return {
            "input": on,
            "is_working_day": cal.is_working_day(d),
            "next_working_day": cal.next_working_day(d).isoformat(),
            "shifted": cal.add_working_days(d, working_days).isoformat(),
            "holidays_nearby": sorted(
                h.isoformat() for h in cal.holidays if abs((h - d).days) <= 7
            ),
        }

    def tool_rate_card_expected_fee(
        self,
        amount: int,
        method: str,
        card_network: str | None = None,
        card_type: str | None = None,
    ) -> dict[str, Any]:
        fb = self.cfg.rate_card.decompose(
            amount, method, card_network=card_network, card_type=card_type
        )
        return {
            "amount": amount,
            "rate_key": fb.rate_key,
            "rate_bps": fb.rate_bps,
            "fee": fb.fee,
            "tax": fb.tax,
            "net": fb.net,
        }

    def tool_calc(self, op: str, values: list[int]) -> dict[str, Any]:
        if op == "sum":
            out = sum(values)
        elif op == "sub":
            out = values[0] - sum(values[1:])
        elif op == "bps":
            out = apply_bps(values[0], values[1])
        else:
            raise ValueError("op must be sum|sub|bps")
        return {"op": op, "values": values, "result": out, "result_display": format_inr(out)}

    def tool_get_proof_tree(self, settlement_id: str) -> dict[str, Any]:
        node = self.result.proof_trees[settlement_id]
        return {"settlement_id": settlement_id, "tree": _compact(node, depth=0)}

    def tool_get_metrics(self) -> dict[str, Any]:
        return dict(self.result.metrics)

    def tool_get_facts(self) -> dict[str, Any]:
        """Month-level controller facts: PG fees, GST on fees (ITC), refunds, chargebacks,
        explained/unexplained. Answer month-level questions from here, not by summing."""
        from barabar.exports.memo import memo_facts

        facts = memo_facts(self.month, self.result)
        return {
            **facts,
            **{
                f"{k}_display": format_inr(int(v))
                for k, v in facts.items()
                if isinstance(v, int)
                and k
                not in (
                    "settlements_processed",
                    "settlements_matched",
                    "exceptions_total",
                    "exceptions_open",
                    "exceptions_auto_resolved",
                )
            },
        }

    def tool_list_settlements(self, limit: int = 50) -> dict[str, Any]:
        matched = {
            link.to_entity.split(":", 1)[1]
            for link in self.result.links
            if link.from_entity.startswith("bank:") and link.to_entity.startswith("settlement:")
        }
        rows = sorted(
            self.month.settlements, key=lambda x: (x.settled_at or x.created_at, x.settlement_id)
        )
        return {
            "count": len(rows),
            "settlements": [
                {
                    "settlement_id": x.settlement_id,
                    "settled_on": (x.settled_at or x.created_at).astimezone(IST).date().isoformat(),
                    "amount": x.amount,
                    "amount_display": format_inr(x.amount),
                    "status": x.status.value,
                    "type": x.type.value,
                    "utr": x.utr,
                    "bank_matched": x.settlement_id in matched,
                }
                for x in rows[:limit]
            ],
        }


def _compact(node: ProofNode, depth: int) -> dict[str, Any]:
    out: dict[str, Any] = {
        "kind": node.kind,
        "label": node.label,
        "amount": node.amount,
        "rule_id": node.rule_id,
    }
    if depth < 2:
        out["children"] = [_compact(c, depth + 1) for c in node.children if c.kind != "line"]
    return out


def _summary(name: str, out: Any) -> str:
    if isinstance(out, dict):
        if "error" in out:
            return f"{name}: {out['error']}"
        keys = [
            k
            for k in ("amount_display", "net_display", "count", "result_display", "shifted", "fee")
            if k in out
        ]
        return f"{name}: " + ", ".join(f"{k}={out[k]}" for k in keys) if keys else name
    return name


def _schema(
    name: str, description: str, props: dict[str, Any], required: list[str]
) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": props,
            "required": required,
            "additionalProperties": False,
        },
    }


_S = {"type": "string"}
_I = {"type": "integer"}
_SN = {"type": ["string", "null"]}
_IN = {"type": ["integer", "null"]}

TOOL_SCHEMAS: tuple[dict[str, Any], ...] = (
    _schema(
        "get_exception",
        "The open exception under investigation: type, amount (paise), entities, reason, candidate link.",
        {"exc_id": _S},
        ["exc_id"],
    ),
    _schema(
        "list_open_exceptions",
        "Other open exceptions in this run (to spot related items).",
        {"limit": _I},
        ["limit"],
    ),
    _schema(
        "get_settlement",
        "A settlement batch: net amount, UTR, status, type, and which bank rows are linked to it.",
        {"settlement_id": _S},
        ["settlement_id"],
    ),
    _schema(
        "get_recon_lines",
        "Recon lines inside a settlement with gross/fee/tax/net totals.",
        {"settlement_id": _S},
        ["settlement_id"],
    ),
    _schema(
        "get_payment",
        "One payment with fee, tax, net, method and the calendar-expected settlement date.",
        {"payment_id": _S},
        ["payment_id"],
    ),
    _schema("get_refunds", "Refunds against a payment.", {"payment_id": _S}, ["payment_id"]),
    _schema("get_dispute", "One dispute / chargeback.", {"dispute_id": _S}, ["dispute_id"]),
    _schema(
        "search_bank",
        "Bank statement rows filtered by exact amount (paise), value-date range (ISO) and narration substring.",
        {"amount": _IN, "date_from": _SN, "date_to": _SN, "narration_like": _SN, "limit": _I},
        ["amount", "date_from", "date_to", "narration_like", "limit"],
    ),
    _schema(
        "search_ledger",
        "Sales ledger entries filtered by exact gross (paise), invoice substring and date range.",
        {"amount": _IN, "invoice_like": _SN, "date_from": _SN, "date_to": _SN, "limit": _I},
        ["amount", "invoice_like", "date_from", "date_to", "limit"],
    ),
    _schema(
        "calendar_shift",
        "Is a date a settlement working day; next working day; date shifted by N working days; RBI holidays within a week.",
        {"on": _S, "working_days": _I},
        ["on", "working_days"],
    ),
    _schema(
        "rate_card_expected_fee",
        "Expected fee/GST/net for an amount under the merchant's rate card.",
        {"amount": _I, "method": _S, "card_network": _SN, "card_type": _SN},
        ["amount", "method", "card_network", "card_type"],
    ),
    _schema(
        "calc",
        "Integer paise arithmetic. op: sum | sub (first minus rest) | bps (values[0] * values[1] / 10000). Use this for every number you state.",
        {"op": _S, "values": {"type": "array", "items": _I}},
        ["op", "values"],
    ),
    _schema(
        "get_proof_tree",
        "Compact proof tree for a settlement (bank credit <- settlement <- groups).",
        {"settlement_id": _S},
        ["settlement_id"],
    ),
    _schema("get_metrics", "Run-level metrics: gross, explained, unexplained, counts.", {}, []),
    _schema(
        "get_facts",
        "Month-level controller facts already computed by rule: gross captured, explained, unexplained, payment-gateway fees, GST on fees claimable as ITC, refunds netted, chargebacks debited, settlement and exception counts. Use this for any month-level total.",
        {},
        [],
    ),
    _schema(
        "list_settlements",
        "Every settlement this month with date, net amount, status and whether a bank credit matched it.",
        {"limit": _I},
        ["limit"],
    ),
)
