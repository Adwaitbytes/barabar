import type { Metadata } from "next";
import Link from "next/link";
import { Badge, type Tone } from "@/components/ui/badge";
import { Table, THead, Th, Td, TdNum } from "@/components/ui/table";
import { Amount } from "@/components/domain/amount";
import { EntityRef } from "@/components/domain/chips";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { StatStrip } from "@/components/legs/stat-strip";
import { FilterChips } from "@/components/legs/filter-chips";
import { FocusRow } from "@/components/legs/focus-row";
import { ShowMoreRows } from "@/components/legs/show-more";
import { activeRunId } from "@/lib/run";
import { getClosePack, getMonth, listExceptions, listLinks } from "@/lib/api";
import { fmtDate, fmtInt } from "@/lib/format";
import { specFor } from "@/lib/exceptions";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ExceptionItem, ExceptionType, LedgerStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Sales ledger" };

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

type View = "" | "matched" | "orphan" | "mismatch" | "duplicate";

const VIEW_TYPE: Record<Exclude<View, "" | "matched">, ExceptionType> = {
  orphan: "ORPHAN_LEDGER_ENTRY",
  mismatch: "AMOUNT_MISMATCH_LEDGER",
  duplicate: "DUPLICATE_LEDGER_ENTRY",
};

const STATUS_TONE: Record<LedgerStatus, Tone> = {
  paid: "settled",
  partial: "open",
  open: "neutral",
  cancelled: "outline",
};

export default async function LedgerPage({ searchParams }: PageProps<"/app/ledger">) {
  const sp = await searchParams;
  const view = first(sp.view) as View;
  const focus = first(sp.focus) || undefined;

  const runId = await activeRunId();
  const [pack, ledger, links, exceptions] = await Promise.all([
    getClosePack(runId),
    getMonth(runId, "ledger"),
    listLinks(runId),
    listExceptions(runId),
  ]);

  // ledger:<id> → payment (A3/A4) or refund (B3) it was matched to.
  const matchedTo = new Map<string, string>();
  for (const l of links) {
    if (l.from_entity.startsWith("ledger:")) matchedTo.set(l.from_entity.slice(7), l.to_entity);
  }
  // ledger:<id> → exceptions naming it.
  const flags = new Map<string, ExceptionItem[]>();
  for (const e of exceptions) {
    for (const ref of e.entities) {
      if (!ref.startsWith("ledger:")) continue;
      const id = ref.slice(7);
      const list = flags.get(id) ?? [];
      list.push(e);
      flags.set(id, list);
    }
  }
  const hasType = (id: string, t: ExceptionType) => (flags.get(id) ?? []).some((e) => e.type === t);

  const sorted = [...ledger].sort((a, b) => a.date.localeCompare(b.date) || a.invoice_no.localeCompare(b.invoice_no));
  const matched = sorted.filter((e) => matchedTo.has(e.ledger_id));
  const countFor = (t: ExceptionType) => sorted.filter((e) => hasType(e.ledger_id, t)).length;

  const rows = sorted.filter((e) => {
    if (!view) return true;
    if (view === "matched") return matchedTo.has(e.ledger_id);
    return hasType(e.ledger_id, VIEW_TYPE[view]);
  });

  const gross = sorted.reduce((a, e) => a + e.gross, 0);
  const matchedPct = sorted.length ? (100 * matched.length) / sorted.length : 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Three legs · Ledger"
        title="Sales ledger"
        description="Invoices from Tally, matched to Razorpay payments by payment id or receipt. Whatever is left is a question for the business, not the bank."
      />

      <StatStrip
        stats={[
          { label: "Entries", value: fmtInt(sorted.length), hint: `source: ${sorted[0]?.source ?? "—"}` },
          { label: "Gross invoiced", value: <Amount paise={gross} size="lg" /> },
          {
            label: "Matched to a payment",
            value: `${fmtInt(matched.length)} · ${matchedPct.toFixed(1)}%`,
            hint: `${fmtInt(sorted.length - matched.length)} without a payment`,
            tone: matchedPct >= 95 ? "settled" : "open",
          },
          {
            label: "Open ledger amount",
            value: <Amount paise={pack.headline.ledger_open} size="lg" />,
            hint: "orphans, mismatches and duplicates",
            tone: pack.headline.ledger_open > 0 ? "open" : "settled",
          },
        ]}
      />

      <FilterChips
        className="mb-3"
        basePath={routes.ledger}
        param="view"
        current={view}
        chips={[
          { value: "all", label: "All", count: sorted.length },
          { value: "matched", label: "Matched", count: matched.length },
          { value: "orphan", label: "Orphan", count: countFor("ORPHAN_LEDGER_ENTRY") },
          { value: "mismatch", label: "Amount mismatch", count: countFor("AMOUNT_MISMATCH_LEDGER") },
          { value: "duplicate", label: "Duplicate", count: countFor("DUPLICATE_LEDGER_ENTRY") },
        ]}
      />

      <FocusRow focus={focus} />

      {rows.length === 0 ? (
        <EmptyState title="Nothing in this view" body="No ledger entries carry this flag in the current run." />
      ) : (
        <div className="overflow-hidden rounded-lg bg-surface hairline">
          <Table>
            <THead className="bg-surface">
              <tr>
                <Th>Date</Th>
                <Th>Invoice</Th>
                <Th>Receipt</Th>
                <Th>Customer</Th>
                <Th className="text-right">Gross</Th>
                <Th>Status</Th>
                <Th>Source</Th>
                <Th>Matched to</Th>
                <Th>Flag</Th>
              </tr>
            </THead>
            <ShowMoreRows
              colSpan={9}
              pageSize={100}
              noun="entries"
              rows={rows.map((e) => {
                const to = matchedTo.get(e.ledger_id);
                const fl = flags.get(e.ledger_id) ?? [];
                const focused = focus === e.ledger_id;
                return (
                  <tr
                    key={e.ledger_id}
                    id={`row-${e.ledger_id}`}
                    tabIndex={-1}
                    className={cn(
                      "border-b border-line transition-colors hover:bg-raised/70 focus:outline-none",
                      focused && "bg-signal-dim/40 hover:bg-signal-dim/60",
                    )}
                  >
                    <Td className="text-text">{fmtDate(e.date)}</Td>
                    <Td className="mono text-[12.5px]">{e.invoice_no}</Td>
                    <Td className="mono text-[12px] text-muted">{e.order_receipt ?? <span className="text-faint">—</span>}</Td>
                    <Td className="mono text-[12px] text-muted">{e.customer_ref ?? <span className="text-faint">—</span>}</Td>
                    <TdNum>
                      <Amount paise={e.gross} />
                    </TdNum>
                    <Td>
                      <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                    </Td>
                    <Td className="text-[12px] text-muted">{e.source}</Td>
                    <Td>{to ? <EntityRef refId={to} /> : <span className="text-faint">—</span>}</Td>
                    <Td>
                      {fl.length ? (
                        <span className="flex flex-wrap gap-1">
                          {fl.map((x) => (
                            <Link key={x.exc_id} href={routes.exception(x.exc_id)}>
                              <Badge tone={x.status === "open" ? "open" : "neutral"} className="hover:brightness-110">
                                {specFor(x.type).title}
                              </Badge>
                            </Link>
                          ))}
                        </span>
                      ) : null}
                    </Td>
                  </tr>
                );
              })}
            />
          </Table>
        </div>
      )}
    </div>
  );
}
