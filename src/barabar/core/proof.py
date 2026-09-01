"""Proof trees: bank credit <- settlement <- lines (gross - fee - tax) - refunds -
disputes +/- adjustments. Every node names the rule that produced the link."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable

from barabar.core.models import (
    EntityKind,
    ExceptionItem,
    MatchLink,
    Month,
    ReconLineType,
    RzReconLine,
    ref,
)
from barabar.core.money import format_inr
from barabar.core.result import ProofNode


def _group(
    kind: str,
    label: str,
    lines: list[RzReconLine],
    rule: str | None,
    extra: dict[str, str | int | float | bool | None] | None = None,
) -> ProofNode:
    children = tuple(
        ProofNode(
            kind="line",
            label=f"{ln.type.value} {ln.entity_id}",
            entity=ref(EntityKind.RECON_LINE, ln.entity_id),
            amount=ln.credit - ln.debit,
            rule_id=rule,
            meta={
                "amount": ln.amount,
                "fee": ln.fee,
                "tax": ln.tax,
                "credit": ln.credit,
                "debit": ln.debit,
                "payment_id": ln.payment_id,
                "dispute_id": ln.dispute_id,
                "order_receipt": ln.order_receipt,
                "method": ln.method,
                "description": ln.description,
            },
        )
        for ln in lines
    )
    total = sum(ln.credit - ln.debit for ln in lines)
    return ProofNode(
        kind="group", label=label, amount=total, rule_id=rule, children=children, meta=extra or {}
    )


def build_proof_trees(
    month: Month, links: Iterable[MatchLink], exceptions: Iterable[ExceptionItem]
) -> dict[str, ProofNode]:
    links = list(links)
    exceptions = list(exceptions)
    lines_by_setl: dict[str, list[RzReconLine]] = defaultdict(list)
    for ln in month.recon_lines:
        if ln.settlement_id:
            lines_by_setl[ln.settlement_id].append(ln)
    bank_by_id = {t.bank_txn_id: t for t in month.bank_txns}
    bank_links: dict[str, list[MatchLink]] = defaultdict(list)
    for link in links:
        if link.from_entity.startswith("bank:") and link.to_entity.startswith("settlement:"):
            bank_links[link.to_entity.split(":", 1)[1]].append(link)
    exc_by_setl: dict[str, list[ExceptionItem]] = defaultdict(list)
    for e in exceptions:
        for ent in e.entities:
            if ent.startswith("settlement:"):
                exc_by_setl[ent.split(":", 1)[1]].append(e)
                break

    trees: dict[str, ProofNode] = {}
    for s in sorted(month.settlements, key=lambda x: x.settlement_id):
        lines = [
            ln for ln in lines_by_setl.get(s.settlement_id, []) if ln.settled and not ln.on_hold
        ]
        pay = [ln for ln in lines if ln.type == ReconLineType.PAYMENT and not ln.dispute_id]
        ref_ = [ln for ln in lines if ln.type == ReconLineType.REFUND]
        disp = [ln for ln in lines if ln.dispute_id]
        adj = [ln for ln in lines if ln.type == ReconLineType.ADJUSTMENT]
        hold = [ln for ln in lines_by_setl.get(s.settlement_id, []) if ln.on_hold]
        groups: list[ProofNode] = []
        if pay:
            groups.append(
                _group(
                    "payments",
                    f"{len(pay)} payments  gross {format_inr(sum(x.amount for x in pay))}  fee {format_inr(sum(x.fee for x in pay))}  GST {format_inr(sum(x.tax for x in pay))}  net {format_inr(sum(x.credit for x in pay))}",
                    pay,
                    "B2-GROSS-FEE-TAX-DECOMP",
                    {
                        "gross": sum(x.amount for x in pay),
                        "fee": sum(x.fee for x in pay),
                        "tax": sum(x.tax for x in pay),
                        "net": sum(x.credit for x in pay),
                    },
                )
            )
        if ref_:
            groups.append(
                _group(
                    "refunds",
                    f"{len(ref_)} refunds  {format_inr(-sum(x.debit for x in ref_))}",
                    ref_,
                    "B3-REFUND-NET",
                )
            )
        if disp:
            groups.append(
                _group(
                    "disputes",
                    f"{len(disp)} dispute(s)  {format_inr(sum(x.credit - x.debit for x in disp))}",
                    disp,
                    None,
                )
            )
        if adj:
            groups.append(
                _group(
                    "adjustments",
                    f"{len(adj)} adjustment(s)  {format_inr(sum(x.credit - x.debit for x in adj))}",
                    adj,
                    None,
                )
            )
        if hold:
            groups.append(
                _group(
                    "on_hold",
                    f"{len(hold)} on hold  {format_inr(sum(x.amount for x in hold))}",
                    hold,
                    None,
                )
            )
        net = sum(ln.credit - ln.debit for ln in lines)
        groups.append(ProofNode(kind="note", label=f"Σ = {format_inr(net)}", amount=net))
        exc_nodes = tuple(
            ProofNode(
                kind="exception",
                label=f"{e.type.value}: {e.reason_text}",
                entity=e.exc_id,
                amount=e.amount,
                confidence=e.confidence,
                meta={"status": e.status.value},
            )
            for e in exc_by_setl.get(s.settlement_id, [])
        )
        setl_node = ProofNode(
            kind="settlement",
            label=f"Settlement {s.settlement_id}  net {format_inr(s.amount)}  {s.status.value} {s.settled_at.isoformat() if s.settled_at else ''}",
            entity=ref(EntityKind.SETTLEMENT, s.settlement_id),
            amount=s.amount,
            rule_id="B1-BATCH-NET",
            children=(*groups, *exc_nodes),
            meta={
                "utr": s.utr,
                "type": s.type.value,
                "status": s.status.value,
                "residual": s.amount - net,
            },
        )
        blinks = bank_links.get(s.settlement_id, [])
        if blinks:
            bank_children = tuple(
                ProofNode(
                    kind="bank",
                    label=f"Bank credit {format_inr(bank_by_id[link.from_entity.split(':', 1)[1]].credit)}  {bank_by_id[link.from_entity.split(':', 1)[1]].bank.value}  {bank_by_id[link.from_entity.split(':', 1)[1]].value_date.isoformat()}",
                    entity=link.from_entity,
                    amount=link.amount_matched,
                    rule_id=link.rule_id,
                    confidence=link.confidence,
                    meta={"narration": bank_by_id[link.from_entity.split(":", 1)[1]].narration_raw},
                )
                for link in blinks
            )
            root = ProofNode(
                kind="root",
                label="Bank credit(s)",
                amount=sum(link.amount_matched for link in blinks),
                children=(*bank_children, setl_node),
            )
        else:
            root = ProofNode(
                kind="root", label="No bank credit matched", amount=0, children=(setl_node,)
            )
        trees[s.settlement_id] = root
    return trees
