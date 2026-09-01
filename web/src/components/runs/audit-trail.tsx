"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityRef, Hash } from "@/components/domain/chips";
import { fmtDateTime, fmtInt } from "@/lib/format";
import type { AuditEvent, AuditTrail as Trail } from "@/lib/types";

const PAGE = 200;

const ACTOR_TONE: Record<string, Tone> = { system: "neutral", agent: "signal" };

function actorTone(actor: string): Tone {
  if (actor.startsWith("user")) return "settled";
  return ACTOR_TONE[actor] ?? "outline";
}

/** Targets are "kind:id", "kind:id->kind:id", or a bare exception id. */
function Target({ target }: { target: string }) {
  if (target.includes("->")) {
    const [from, to] = target.split("->");
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <EntityRef refId={from} />
        <span className="text-faint">→</span>
        <EntityRef refId={to} />
      </span>
    );
  }
  if (target.includes(":")) return <EntityRef refId={target} />;
  if (target.startsWith("exc_")) return <EntityRef refId={`exception:${target}`} />;
  return <code className="text-[12px] text-text">{target}</code>;
}

export function AuditTrailView({ trail }: { trail: Trail }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of trail.events) m.set(e.action, (m.get(e.action) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [trail.events]);

  const rows = useMemo(
    () => (filter ? trail.events.filter((e) => e.action === filter) : trail.events),
    [trail.events, filter],
  );
  const visible = rows.slice(0, limit);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[13px]",
            trail.verified ? "text-settled-fg" : "text-critical-fg",
          )}
        >
          {trail.verified ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
          {trail.verified ? "Chain verified" : "Chain broken"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
          head <Hash value={trail.head} n={12} />
        </span>
        <span className="mono text-[12px] text-muted">{fmtInt(trail.events.length)} events</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by action">
        <Chip active={filter === null} onClick={() => { setFilter(null); setLimit(PAGE); }}>
          All <span className="text-faint">{fmtInt(trail.events.length)}</span>
        </Chip>
        {counts.map(([action, n]) => (
          <Chip key={action} active={filter === action} onClick={() => { setFilter(action); setLimit(PAGE); }}>
            <code>{action}</code> <span className="text-faint">{fmtInt(n)}</span>
          </Chip>
        ))}
      </div>

      <ol className="divide-y divide-line rounded-lg hairline bg-surface">
        {visible.map((e, i) => (
          <Row key={e.event_id} e={e} index={i} />
        ))}
      </ol>

      {visible.length < rows.length && (
        <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
          <span>
            Showing {fmtInt(visible.length)} of {fmtInt(rows.length)}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
            Show {fmtInt(Math.min(PAGE, rows.length - visible.length))} more
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ e, index }: { e: AuditEvent; index: number }) {
  return (
    <li style={{ "--i": index } as React.CSSProperties} className="cascade row-accent accent-signal grid grid-cols-[112px_72px_170px_minmax(0,1fr)] items-start gap-3 px-3 py-2 text-[12.5px] max-lg:grid-cols-[112px_72px_minmax(0,1fr)]">
      <span className="mono text-[11.5px] text-faint">{fmtDateTime(e.ts)}</span>
      <Badge tone={actorTone(e.actor)}>{e.actor.split(":")[0]}</Badge>
      <code className="text-[12px] text-muted">{e.action}</code>
      <div className="min-w-0 max-lg:col-span-3">
        <Target target={e.target} />
        <div className="mt-0.5 truncate font-mono text-[11.5px] text-faint" title={e.rule_or_evidence}>
          {e.rule_or_evidence}
        </div>
      </div>
    </li>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] transition-colors",
        active ? "bg-text text-bg" : "bg-surface text-muted hairline hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
