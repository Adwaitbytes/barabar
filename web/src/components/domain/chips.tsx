import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge, type Tone } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import type {
  ExceptionStatus,
  ExceptionType,
  SettlementMatchStatus,
  Tier,
} from "@/lib/types";
import { parseRef } from "@/lib/types";
import { entityHref } from "@/lib/routes";
import { specFor } from "@/lib/exceptions";

/* ---------- tiers ---------- */

const TIER_LABEL: Record<Tier, string> = {
  A: "Tier A · exact",
  B: "Tier B · arithmetic",
  C: "Tier C · fuzzy",
  "D-accepted": "Tier D · accepted by a person",
};

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const tone: Tone =
    tier === "A" ? "settled" : tier === "B" ? "signal" : tier === "C" ? "open" : "outline";
  return (
    <Hint label={TIER_LABEL[tier]}>
      <span>
        <Badge tone={tone} className={cn("mono", className)}>
          {tier === "D-accepted" ? "D" : tier}
        </Badge>
      </span>
    </Hint>
  );
}

/* ---------- rule ids ---------- */

export function RuleId({ id, className }: { id: string | null | undefined; className?: string }) {
  if (!id) return <span className="text-faint">, </span>;
  return (
    <code
      className={cn(
        "inline-flex h-5 items-center rounded-[4px] bg-sunken px-1.5 text-[11px] text-muted hairline",
        className,
      )}
    >
      {id}
    </code>
  );
}

/* ---------- confidence ---------- */

export function Confidence({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  const tone = value >= 0.92 ? "bg-settled" : value >= 0.8 ? "bg-open" : "bg-critical";
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={`${pct}% confidence`}>
      <span className="relative h-1 w-12 overflow-hidden rounded-full bg-line">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="mono text-[12px] text-muted">{pct}%</span>
    </span>
  );
}

/* ---------- exception status ---------- */

const EXC_STATUS: Record<ExceptionStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "open" },
  investigating: { label: "Investigating", tone: "signal" },
  resolved: { label: "Resolved", tone: "settled" },
  accepted: { label: "Accepted", tone: "settled" },
  auto_resolved: { label: "Auto-resolved", tone: "neutral" },
};

export function ExceptionStatusPill({ status }: { status: ExceptionStatus }) {
  const s = EXC_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/* ---------- settlement match status ---------- */

const MATCH_STATUS: Record<SettlementMatchStatus, { label: string; tone: Tone; dot: string }> = {
  matched: { label: "Matched", tone: "settled", dot: "bg-settled" },
  split: { label: "Split UTRs", tone: "settled", dot: "bg-settled" },
  partial: { label: "Partial", tone: "signal", dot: "bg-signal" },
  proposed: { label: "Proposed", tone: "open", dot: "bg-open" },
  pending: { label: "Bank lag", tone: "open", dot: "bg-open" },
  open: { label: "Open", tone: "open", dot: "bg-open" },
  missing: { label: "Missing credit", tone: "critical", dot: "bg-critical" },
  failed: { label: "Returned", tone: "critical", dot: "bg-critical" },
  duplicate: { label: "Duplicate", tone: "critical", dot: "bg-critical" },
  unmatched: { label: "Unmatched", tone: "neutral", dot: "bg-faint" },
};

export function MatchStatusPill({ status }: { status: SettlementMatchStatus }) {
  const s = MATCH_STATUS[status];
  return (
    <Badge tone={s.tone}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}

export function matchStatusLabel(status: SettlementMatchStatus): string {
  return MATCH_STATUS[status].label;
}

/* ---------- exception type ---------- */

export function ExceptionTypeChip({ type, className }: { type: ExceptionType; className?: string }) {
  const spec = specFor(type);
  return (
    <Hint label={spec.meaning}>
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className="text-[13px] font-medium text-text">{spec.title}</span>
        <code className="text-[10.5px] text-faint">{type}</code>
      </span>
    </Hint>
  );
}

/* ---------- entity refs ---------- */

const KIND_LABEL: Record<string, string> = {
  payment: "pay",
  refund: "rfnd",
  dispute: "disp",
  adjustment: "adj",
  settlement: "setl",
  recon_line: "line",
  bank: "bank",
  ledger: "ledger",
};

export function EntityRef({ refId, className }: { refId: string; className?: string }) {
  const { kind, id } = parseRef(refId);
  return (
    <Link
      href={entityHref(refId)}
      className={cn(
        "group inline-flex items-center gap-1 rounded-[4px] font-mono text-[12px] text-text hover:text-signal-fg",
        className,
      )}
    >
      <span className="text-faint group-hover:text-signal-fg/70">{KIND_LABEL[kind] ?? kind}</span>
      <span className="underline decoration-line underline-offset-[3px] group-hover:decoration-signal">
        {id}
      </span>
    </Link>
  );
}

/* ---------- hashes ---------- */

export function Hash({ value, n = 8 }: { value: string | null | undefined; n?: number }) {
  if (!value) return <span className="text-faint">, </span>;
  return (
    <Hint label={value}>
      <code className="text-[12px] text-muted">{value.slice(0, n)}</code>
    </Hint>
  );
}
