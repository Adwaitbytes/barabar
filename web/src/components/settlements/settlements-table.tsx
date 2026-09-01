import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Td, TdNum } from "@/components/ui/table";
import { Amount } from "@/components/domain/amount";
import { MatchStatusPill } from "@/components/domain/chips";
import { LinkRow } from "@/components/legs/link-row";
import { EmptyState } from "@/components/shell/page-header";
import { fmtDate, weekday } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ClosePackSettlement, SettlementType } from "@/lib/types";

const TYPE_TONE: Record<SettlementType, "neutral" | "signal" | "outline"> = {
  standard: "neutral",
  instant: "signal",
  partial: "outline",
};

const ACCENT: Record<ClosePackSettlement["match_status"], "settled" | "open" | "critical" | "signal"> = {
  matched: "settled",
  split: "settled",
  partial: "signal",
  proposed: "open",
  pending: "open",
  open: "open",
  missing: "critical",
  failed: "critical",
  duplicate: "critical",
  unmatched: "signal",
};

export function SettlementsTable({
  rows,
  highlight,
}: {
  rows: ClosePackSettlement[];
  /** Settlement ids that matched the free-text query through their lines. */
  highlight?: Set<string>;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No settlements match"
        body="Clear the filter or search by settlement id, UTR, payment id or order receipt."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-lg bg-surface hairline">
      <Table>
        <THead className="bg-surface">
          <tr>
            <Th>Settled on</Th>
            <Th>Settlement</Th>
            <Th>Type</Th>
            <Th>UTR</Th>
            <Th className="text-right">Lines</Th>
            <Th className="text-right">Gross</Th>
            <Th className="text-right">Fee</Th>
            <Th className="text-right">GST</Th>
            <Th className="text-right">Net to bank</Th>
            <Th>Status</Th>
          </tr>
        </THead>
        <tbody className="[&_tr:last-child]:border-0">
          {rows.map((s, i) => {
            const hit = highlight?.has(s.settlement_id);
            return (
              <LinkRow
                key={s.settlement_id}
                id={`row-${s.settlement_id}`}
                href={routes.settlement(s.settlement_id)}
                style={{ "--i": i } as React.CSSProperties}
                className={cn("cascade", `accent-${ACCENT[s.match_status]}`, hit && "bg-signal-dim/40 hover:bg-signal-dim/60")}
              >
                <Td>
                  <span className="text-text">{fmtDate(s.settled_on)}</span>
                  <span className="ml-1.5 text-[11px] text-faint">{weekday(s.settled_on)}</span>
                </Td>
                <Td className="mono text-[12.5px]">{s.settlement_id}</Td>
                <Td>
                  <Badge tone={TYPE_TONE[s.type]}>{s.type}</Badge>
                </Td>
                <Td className="mono text-[12px] text-muted">{s.utr ?? <span className="text-faint">—</span>}</Td>
                <TdNum className="text-muted">{s.lines}</TdNum>
                <TdNum>
                  <Amount paise={s.gross} tone="muted" size="sm" />
                </TdNum>
                <TdNum>
                  <Amount paise={s.fee} tone="muted" size="sm" />
                </TdNum>
                <TdNum>
                  <Amount paise={s.tax} tone="muted" size="sm" />
                </TdNum>
                <TdNum>
                  <Amount paise={s.amount} />
                </TdNum>
                <Td>
                  <MatchStatusPill status={s.match_status} />
                </Td>
              </LinkRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
