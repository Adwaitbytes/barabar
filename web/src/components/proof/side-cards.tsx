import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Amount } from "@/components/domain/amount";
import { Confidence, EntityRef, ExceptionStatusPill, RuleId, TierBadge } from "@/components/domain/chips";
import { specFor } from "@/lib/exceptions";
import { routes } from "@/lib/routes";
import type { ExceptionItem, MatchLink } from "@/lib/types";

export function LinksCard({ links, selfRef }: { links: MatchLink[]; selfRef: string }) {
  // Hundreds of line→settlement links say the same thing; fold them into one row.
  const lineLinks = links.filter((l) => l.from_entity.startsWith("recon_line:"));
  const others = links.filter((l) => !l.from_entity.startsWith("recon_line:"));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Links</CardTitle>
        <span className="mono text-[11px] text-faint">{links.length}</span>
      </CardHeader>
      <CardBody className="space-y-2">
        {others.length === 0 && lineLinks.length === 0 && (
          <p className="text-[13px] text-muted">No links yet. Nothing in the bank statement points at this batch.</p>
        )}
        {others.map((l) => {
          const other = l.from_entity === selfRef ? l.to_entity : l.from_entity;
          const direction = l.from_entity === selfRef ? "→" : "←";
          return (
            <div key={l.link_id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <TierBadge tier={l.tier} />
              <span className="mono text-faint">{direction}</span>
              <EntityRef refId={other} />
              <RuleId id={l.rule_id} />
              <Confidence value={l.confidence} className="ml-auto" />
            </div>
          );
        })}
        {lineLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
            <TierBadge tier={lineLinks[0].tier} />
            <span className="text-muted">
              <span className="mono text-text">{lineLinks.length}</span> recon lines
            </span>
            <RuleId id={lineLinks[0].rule_id} />
            <span className="ml-auto">
              <Amount paise={lineLinks.reduce((s, l) => s + l.amount_matched, 0)} size="sm" tone="muted" />
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function ExceptionsCard({ items }: { items: ExceptionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exceptions on this settlement</CardTitle>
        <span className="mono text-[11px] text-faint">{items.length}</span>
      </CardHeader>
      <CardBody className="space-y-1">
        {items.length === 0 && <p className="text-[13px] text-muted">None. This batch explains itself.</p>}
        {items.map((e) => (
          <Link
            key={e.exc_id}
            href={routes.exception(e.exc_id)}
            className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-raised"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-text">{specFor(e.type).title}</span>
                <ExceptionStatusPill status={e.status} />
              </div>
              <p className="mt-0.5 truncate text-[12px] text-muted" title={e.reason_text}>
                {e.reason_text}
              </p>
            </div>
            <Amount paise={e.amount} size="sm" tone={e.status === "open" ? "open" : "muted"} />
            <ArrowRight className="size-3.5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
          </Link>
        ))}
      </CardBody>
    </Card>
  );
}
