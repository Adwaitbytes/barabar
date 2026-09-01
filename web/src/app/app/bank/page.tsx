import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Table, THead, Th, Td, TdNum } from "@/components/ui/table";
import { Hint } from "@/components/ui/tooltip";
import { Amount } from "@/components/domain/amount";
import { EntityRef } from "@/components/domain/chips";
import { EmptyState, PageHeader } from "@/components/shell/page-header";
import { StatStrip } from "@/components/legs/stat-strip";
import { FilterChips } from "@/components/legs/filter-chips";
import { FocusRow } from "@/components/legs/focus-row";
import { activeRunId } from "@/lib/run";
import { getMonth, listLinks } from "@/lib/api";
import { fmtDate, fmtInt, weekday } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { BankTxn } from "@/lib/types";

export const metadata: Metadata = { title: "Bank statement" };

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

type View = "" | "razorpay" | "other" | "debits" | "unlinked";

export default async function BankPage({ searchParams }: PageProps<"/app/bank">) {
  const sp = await searchParams;
  const view = first(sp.view) as View;
  const focus = first(sp.focus) || undefined;

  const runId = await activeRunId();
  const [txns, links] = await Promise.all([getMonth(runId, "bank_txns"), listLinks(runId)]);

  const linkedTo = new Map<string, string>();
  for (const l of links) {
    if (l.from_entity.startsWith("bank:") && l.to_entity.startsWith("settlement:")) {
      linkedTo.set(l.from_entity.slice(5), l.to_entity);
    }
  }

  const sorted = [...txns].sort(
    (a, b) => a.value_date.localeCompare(b.value_date) || a.row_no - b.row_no,
  );
  const isRz = (t: BankTxn) => t.credit > 0 && Boolean(t.narration?.razorpay_like);
  const credits = sorted.filter((t) => t.credit > 0);
  const rz = credits.filter(isRz);
  const unlinkedRz = rz.filter((t) => !linkedTo.has(t.bank_txn_id));
  const debits = sorted.filter((t) => t.debit > 0);

  const rows = sorted.filter((t) => {
    switch (view) {
      case "razorpay":
        return isRz(t);
      case "other":
        return t.credit > 0 && !isRz(t);
      case "debits":
        return t.debit > 0;
      case "unlinked":
        return isRz(t) && !linkedTo.has(t.bank_txn_id);
      default:
        return true;
    }
  });

  const sum = (xs: BankTxn[], k: "credit" | "debit") => xs.reduce((a, t) => a + t[k], 0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Three legs · Bank"
        title="Bank statement"
        description="Every line of the statement, its narration parsed by the bank's grammar, and which settlement each Razorpay credit belongs to."
      />

      <StatStrip
        stats={[
          {
            label: "Credits",
            value: <Amount paise={sum(credits, "credit")} size="lg" />,
            hint: `${fmtInt(credits.length)} lines`,
          },
          {
            label: "From Razorpay",
            value: <Amount paise={sum(rz, "credit")} size="lg" />,
            hint: `${fmtInt(rz.length)} credits recognised by narration`,
            tone: "settled",
          },
          {
            label: "Unlinked Razorpay credits",
            value: <Amount paise={sum(unlinkedRz, "credit")} size="lg" />,
            hint: unlinkedRz.length ? `${fmtInt(unlinkedRz.length)} to investigate` : "every credit has a batch",
            tone: unlinkedRz.length ? "critical" : "settled",
          },
          {
            label: "Debits",
            value: <Amount paise={sum(debits, "debit")} size="lg" />,
            hint: `${fmtInt(debits.length)} lines, not Razorpay's business`,
          },
        ]}
      />

      <FilterChips
        className="mb-3"
        basePath={routes.bank}
        param="view"
        current={view}
        chips={[
          { value: "all", label: "All", count: sorted.length },
          { value: "razorpay", label: "Razorpay credits", count: rz.length },
          { value: "other", label: "Other credits", count: credits.length - rz.length },
          { value: "debits", label: "Debits", count: debits.length },
          { value: "unlinked", label: "Unlinked", count: unlinkedRz.length },
        ]}
      />

      <FocusRow focus={focus} />

      {rows.length === 0 ? (
        <EmptyState title="Nothing in this view" body="Every statement line is accounted for elsewhere." />
      ) : (
        <div className="overflow-hidden rounded-lg bg-surface hairline">
          <Table>
            <THead className="bg-surface">
              <tr>
                <Th>Value date</Th>
                <Th>Bank</Th>
                <Th>Narration</Th>
                <Th>Parsed</Th>
                <Th className="text-right">Credit</Th>
                <Th className="text-right">Debit</Th>
                <Th className="text-right">Balance</Th>
                <Th>Linked to</Th>
              </tr>
            </THead>
            <tbody className="[&_tr:last-child]:border-0">
              {rows.map((t) => {
                const n = t.narration;
                const link = linkedTo.get(t.bank_txn_id);
                const focused = focus === t.bank_txn_id;
                const rzUnlinked = isRz(t) && !link;
                return (
                  <tr
                    key={t.bank_txn_id}
                    id={`row-${t.bank_txn_id}`}
                    tabIndex={-1}
                    className={cn(
                      "border-b border-line transition-colors hover:bg-raised/70 focus:outline-none",
                      focused && "bg-signal-dim/40 hover:bg-signal-dim/60",
                    )}
                  >
                    <Td>
                      <span className="text-text">{fmtDate(t.value_date)}</span>
                      <span className="ml-1.5 text-[11px] text-faint">{weekday(t.value_date)}</span>
                      {t.posted_date !== t.value_date && (
                        <Hint label={`Posted ${fmtDate(t.posted_date)}`}>
                          <span className="ml-1 text-[11px] text-open-fg">†</span>
                        </Hint>
                      )}
                    </Td>
                    <Td>
                      <Badge tone="outline" className="mono">
                        {t.bank}
                      </Badge>
                    </Td>
                    <Td className="max-w-[360px]">
                      <span className="mono block truncate text-[12px] text-muted" title={t.narration_raw}>
                        {t.narration_raw}
                      </span>
                      <span className="mono text-[10.5px] text-faint">
                        row {t.row_no} · {t.source_file}
                      </span>
                    </Td>
                    <Td>
                      {n ? (
                        <span className="flex flex-wrap items-center gap-1">
                          <span
                            className={cn("size-1.5 rounded-full", n.razorpay_like ? "bg-settled" : "bg-faint")}
                            title={n.razorpay_like ? "Razorpay-like narration" : "Not Razorpay"}
                          />
                          <Badge tone="neutral" className="mono">
                            {n.mode}
                          </Badge>
                          {n.utr_full && <code className="text-[11.5px] text-text">{n.utr_full}</code>}
                          {!n.utr_full && n.utr_prefix && (
                            <>
                              <code className="text-[11.5px] text-text">{n.utr_prefix}…</code>
                              <Badge tone="open">truncated</Badge>
                            </>
                          )}
                          {n.counterparty && !n.razorpay_like && (
                            <span className="truncate text-[11.5px] text-faint" title={n.counterparty}>
                              {n.counterparty}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-faint">unparsed</span>
                      )}
                    </Td>
                    <TdNum>{t.credit > 0 ? <Amount paise={t.credit} tone={isRz(t) ? "settled" : "default"} /> : null}</TdNum>
                    <TdNum>{t.debit > 0 ? <Amount paise={t.debit} tone="muted" /> : null}</TdNum>
                    <TdNum>{t.balance_after !== null ? <Amount paise={t.balance_after} tone="muted" size="sm" /> : "—"}</TdNum>
                    <Td>
                      {link ? (
                        <EntityRef refId={link} />
                      ) : rzUnlinked ? (
                        <Badge tone="critical">no batch</Badge>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
