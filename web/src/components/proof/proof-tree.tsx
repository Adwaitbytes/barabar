"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Amount, Delta } from "@/components/domain/amount";
import { RuleId } from "@/components/domain/chips";
import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";
import { entityHref } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ProofNode } from "@/lib/types";

/**
 * The proof tree, rendered as a monospace ledger. One row per node, amounts in
 * a fixed right-hand column, the rule that produced each link beside it.
 * This stays a text tree on purpose: a controller reads it like a passbook.
 */

const COLLAPSE_OVER = 12;

/** Nodes in a subtree, for pre-order row numbering (drives the mount cascade). */
function countNodes(n: ProofNode): number {
  return 1 + (n.children ?? []).reduce((s, c) => s + countNodes(c), 0);
}
function childOrder(parent: number, siblings: ProofNode[], i: number): number {
  let o = parent + 1;
  for (let k = 0; k < i; k++) o += countNodes(siblings[k]);
  return o;
}

/** The backend also emits "exception" nodes that the shared type does not name yet. */
type Kind = ProofNode["kind"] | "exception";

const GLYPH: Record<Kind, string> = {
  root: "",
  bank: "◆",
  settlement: "■",
  group: "Σ",
  line: "·",
  payment: "·",
  refund: "·",
  dispute: "·",
  adjustment: "·",
  note: "=",
  exception: "!",
};

function toneFor(node: ProofNode): "settled" | "critical" | "default" | "muted" {
  if (node.kind === "line" || node.kind === "group") {
    if ((node.amount ?? 0) < 0) return "critical";
    return node.kind === "line" ? "muted" : "default";
  }
  if (node.kind === "bank") return "settled";
  return "default";
}

function labelFor(node: ProofNode): { title: string; sub?: string } {
  // Labels arrive as "Bank credit ₹1,13,149.51  HDFC  2026-08-05"; the amount is
  // already in its own column, so keep the descriptive part only.
  const parts = node.label.split(/\s{2,}/);
  switch (node.kind) {
    case "bank":
      return { title: parts.slice(1).join(" · ") || "Bank credit", sub: String(node.meta.narration ?? "") };
    case "settlement":
      return {
        title: `Settlement ${node.entity?.split(":")[1] ?? ""}`,
        sub: parts.slice(1).filter((p) => !p.startsWith("net")).join(" · "),
      };
    case "group":
      return { title: parts[0].replace(/\s+-?₹.*$/, "") };
    case "note":
      return { title: "Σ batch total" };
    case "line": {
      const [type, id] = node.label.split(" ");
      return { title: type, sub: id };
    }
    default:
      return { title: node.label };
  }
}

export function ProofTree({ root, bankAmount }: { root: ProofNode; bankAmount: number | null }) {
  const children = root.children ?? [];
  const banks = children.filter((c) => c.kind === "bank");
  const rest = children.filter((c) => c.kind !== "bank");
  const ordered = [...banks, ...rest];

  return (
    <div className="overflow-hidden rounded-lg bg-surface hairline">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="text-[12px] font-medium text-muted">{root.label}</span>
        <span className="mono text-[11px] uppercase tracking-[0.08em] text-faint">rule · confidence</span>
      </div>
      <ol className="mono px-2 py-2 text-[12.5px]">
        {ordered.map((n, i) => (
          <Node key={i} node={n} depth={0} last={i === ordered.length - 1} bankAmount={bankAmount} order={childOrder(-1, ordered, i)} />
        ))}
      </ol>
    </div>
  );
}

function Node({
  node,
  depth,
  last,
  bankAmount,
  order,
}: {
  node: ProofNode;
  depth: number;
  last: boolean;
  bankAmount: number | null;
  order: number;
}) {
  const kids = node.children ?? [];
  const collapsible = node.kind === "group" && kids.length > 0;
  const [open, setOpen] = React.useState(!(collapsible && kids.length > COLLAPSE_OVER));
  const kind = node.kind as Kind;
  const { title, sub } = labelFor(node);
  const tone = toneFor(node);
  const isTotal = node.kind === "note";
  const residual = isTotal && bankAmount !== null && node.amount !== null ? node.amount - bankAmount : 0;
  const excId = kind === "exception" ? node.entity : null;
  const excStatus = kind === "exception" ? String(node.meta.status ?? "") : "";

  return (
    <li className="relative">
      <div
        className={cn(
          "cascade group relative flex min-h-8 items-center gap-2 rounded-md pr-2 hover:bg-raised/70",
          isTotal && "mt-1 border-t border-line-strong pt-1.5 font-medium",
        )}
        style={{ paddingLeft: `${depth * 22 + 8}px`, "--i": Math.min(order, 40) } as React.CSSProperties}
      >
        {/* tree guides drawn with borders so the row can wrap */}
        {depth > 0 && (
          <>
            <span
              aria-hidden
              className={cn("absolute border-l border-line-strong", last ? "top-0 h-1/2" : "inset-y-0")}
              style={{ left: `${(depth - 1) * 22 + 15}px` }}
            />
            <span
              aria-hidden
              className="absolute top-1/2 w-3 border-t border-line-strong"
              style={{ left: `${(depth - 1) * 22 + 15}px` }}
            />
          </>
        )}

        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
            className="flex size-5 shrink-0 items-center justify-center rounded text-faint hover:bg-sunken hover:text-text"
          >
            <ChevronRight
              className={cn("size-3.5 transition-transform duration-200 ease-out-quart", open && "rotate-90")}
            />
          </button>
        ) : (
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center text-[11px]",
              kind === "bank" && "text-settled",
              kind === "settlement" && "text-signal",
              kind === "exception" && (excStatus === "open" ? "text-open" : "text-faint"),
              kind !== "bank" && kind !== "settlement" && kind !== "exception" && "text-faint",
            )}
            aria-hidden
          >
            {GLYPH[kind]}
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {node.entity && kind !== "exception" && kind !== "line" ? (
            <Link
              href={entityHref(node.entity)}
              className={cn(
                "truncate font-sans text-[13px] hover:text-signal-fg hover:underline",
                isTotal ? "text-text" : "text-text",
              )}
            >
              {title}
            </Link>
          ) : excId ? (
            <Link
              href={routes.exception(excId)}
              className="truncate font-sans text-[13px] text-text hover:text-signal-fg hover:underline"
            >
              {title}
            </Link>
          ) : (
            <span className={cn("truncate font-sans text-[13px]", node.kind === "line" ? "text-muted" : "text-text")}>
              {title}
            </span>
          )}
          {sub && (
            <span className="truncate text-[11.5px] text-faint" title={sub}>
              {sub}
            </span>
          )}
          {collapsible && !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="font-sans text-[11.5px] text-signal-fg hover:underline"
            >
              show all {kids.length}
            </button>
          )}
          {kind === "exception" && excStatus && (
            <Badge tone={excStatus === "open" ? "open" : "neutral"}>{excStatus.replace("_", " ")}</Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {node.rule_id && <RuleId id={node.rule_id} />}
          {node.confidence !== null && node.confidence !== undefined && node.kind !== "note" && (
            <span
              className={cn(
                "w-9 text-right text-[11px]",
                node.confidence >= 0.92 ? "text-settled-fg" : node.confidence >= 0.8 ? "text-open-fg" : "text-critical-fg",
              )}
            >
              {Math.round(node.confidence * 100)}%
            </span>
          )}
          <span className="w-[132px] text-right">
            {node.amount !== null && node.amount !== undefined && kind !== "exception" ? (
              <Amount paise={node.amount} tone={tone} size={isTotal ? "md" : "sm"} />
            ) : node.amount !== null && kind === "exception" ? (
              <Amount paise={node.amount} tone="muted" size="sm" />
            ) : null}
          </span>
        </div>
      </div>

      {isTotal && residual !== 0 && (
        <div
          className="flex items-center justify-between rounded-md bg-critical-dim/40 px-2 py-1 text-[11.5px] text-critical-fg"
          style={{ marginLeft: `${depth * 22 + 8}px` }}
        >
          <span className="font-sans">Residual against bank credit</span>
          <Delta paise={residual} />
        </div>
      )}

      {kids.length > 0 && (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out-quart motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <ol className="overflow-hidden">
            {kids.map((k, i) => (
              <Node key={i} node={k} depth={depth + 1} last={i === kids.length - 1} bankAmount={bankAmount} order={childOrder(order, kids, i)} />
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}
