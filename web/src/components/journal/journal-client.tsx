"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Download, FileSpreadsheet, FileText, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/domain/amount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { MatchLink, RzReconLine, RzSettlement } from "@/lib/types";
import { vouchersForRun, type GstSplit } from "./vouchers";

export function JournalClient({
  settlements,
  reconLines,
  links,
  live,
  exports,
}: {
  settlements: RzSettlement[];
  reconLines: RzReconLine[];
  links: MatchLink[];
  live: boolean;
  exports: { journal: string; tally: string; exceptions: string; memo: string };
}) {
  const [split, setSplit] = React.useState<GstSplit>("igst");
  const [open, setOpen] = React.useState<Set<string>>(() => new Set());
  const vouchers = React.useMemo(() => vouchersForRun(settlements, reconLines, links, split), [settlements, reconLines, links, split]);

  const totals = vouchers.reduce(
    (a, v) => ({ debit: a.debit + v.totals.debit, credit: a.credit + v.totals.credit }),
    { debit: 0, credit: 0 },
  );
  const unbalanced = vouchers.filter((v) => !v.balanced).length;
  const unmatched = vouchers.filter((v) => !v.matched).length;
  const byLedger = React.useMemo(() => {
    const m = new Map<string, { debit: number; credit: number }>();
    for (const v of vouchers)
      for (const l of v.lines) {
        const cur = m.get(l.ledger) ?? { debit: 0, credit: 0 };
        m.set(l.ledger, { debit: cur.debit + l.debit, credit: cur.credit + l.credit });
      }
    return [...m.entries()].sort((a, b) => b[1].debit + b[1].credit - (a[1].debit + a[1].credit));
  }, [vouchers]);

  const tallyHref = `${exports.tally}?gst_split=${split}`;

  function toggle(id: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={split} onValueChange={(v) => setSplit(v as GstSplit)}>
          <TabsList aria-label="GST split">
            <TabsTrigger value="igst">IGST</TabsTrigger>
            <TabsTrigger value="cgst_sgst">CGST + SGST</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-[12.5px] text-muted">
          {vouchers.length} vouchers · {unbalanced === 0 ? "all balanced" : `${unbalanced} unbalanced`}
          {unmatched > 0 && ` · ${unmatched} without a matched bank credit`}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <ExportButton href={exports.journal} live={live} icon={FileSpreadsheet} label="Journal CSV" />
          <ExportButton href={tallyHref} live={live} icon={FileCode2} label="Tally XML" />
          <ExportButton href={exports.exceptions} live={live} icon={FileSpreadsheet} label="Exceptions CSV" />
          <ExportButton href={exports.memo} live={live} icon={FileText} label="Controller memo" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-lg bg-surface hairline shadow-1">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-[0.08em] text-faint">
              <tr>
                <th className="h-9 px-3 text-left">Date</th>
                <th className="h-9 px-3 text-left">Voucher</th>
                <th className="h-9 px-3 text-left">Narration</th>
                <th className="h-9 px-3 text-right">Debit</th>
                <th className="h-9 px-3 text-right">Credit</th>
                <th className="h-9 w-16 px-3 text-center">Balanced</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => {
                const isOpen = open.has(v.voucher_no);
                return (
                  <React.Fragment key={v.voucher_no}>
                    <tr
                      className={cn("cursor-pointer border-b border-line transition-colors hover:bg-raised/70", isOpen && "bg-raised/50")}
                      onClick={() => toggle(v.voucher_no)}
                    >
                      <td className="h-10 whitespace-nowrap px-3 text-muted">{fmtDate(v.date)}</td>
                      <td className="h-10 whitespace-nowrap px-3">
                        <span className="inline-flex items-center gap-1.5">
                          <ChevronDown className={cn("size-3.5 text-faint transition-transform", isOpen && "rotate-180")} />
                          <code className="text-[12px]">{v.voucher_no}</code>
                          <Badge tone="neutral">Receipt</Badge>
                        </span>
                      </td>
                      <td className="max-w-0 px-3">
                        <span className="block truncate text-muted" title={v.narration}>
                          {v.narration}
                        </span>
                      </td>
                      <td className="h-10 px-3 text-right">
                        <Amount paise={v.totals.debit} />
                      </td>
                      <td className="h-10 px-3 text-right">
                        <Amount paise={v.totals.credit} />
                      </td>
                      <td className="h-10 px-3 text-center">
                        <Hint label={v.balanced ? (v.matched ? "Balanced, bank credit matched" : "Balanced, bank credit not matched yet") : "Debits and credits differ"}>
                          <span className={cn("inline-block size-2 rounded-full", !v.balanced ? "bg-critical" : v.matched ? "bg-settled" : "bg-open")} />
                        </Hint>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="fade-in border-b border-line bg-sunken/60">
                        <td colSpan={6} className="px-3 py-3">
                          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                            <table className="text-[12.5px]">
                              <tbody>
                                {v.lines.map((l, i) => (
                                  <tr key={i}>
                                    <td className={cn("py-1 pr-6", l.credit ? "pl-8 text-muted" : "text-text")}>
                                      {l.credit ? "To " : "Dr "}
                                      {l.ledger}
                                    </td>
                                    <td className="py-1 pr-6 text-right">{l.debit ? <Amount paise={l.debit} /> : null}</td>
                                    <td className="py-1 text-right">{l.credit ? <Amount paise={l.credit} /> : null}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="text-[12px] text-muted">
                              <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-faint">Source</div>
                              <Link href={routes.settlement(v.settlement_id)} className="mono text-signal-fg underline-offset-4 hover:underline">
                                {v.settlement_id}
                              </Link>
                              <p className="mt-2 max-w-xs">{v.narration}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="border-t border-line-strong text-[13px] font-medium">
              <tr>
                <td colSpan={3} className="h-10 px-3 text-muted">
                  Total
                </td>
                <td className="h-10 px-3 text-right">
                  <Amount paise={totals.debit} />
                </td>
                <td className="h-10 px-3 text-right">
                  <Amount paise={totals.credit} />
                </td>
                <td className="h-10 px-3 text-center">
                  <span className={cn("inline-block size-2 rounded-full", totals.debit === totals.credit ? "bg-settled" : "bg-critical")} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <aside className="self-start rounded-lg bg-surface p-4 hairline shadow-1">
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">By ledger</h2>
          <ul className="space-y-2 text-[12.5px]">
            {byLedger.map(([ledger, t]) => (
              <li key={ledger} className="flex items-baseline justify-between gap-3">
                <span className="truncate text-muted">{ledger}</span>
                <span className="shrink-0">
                  {t.debit ? <Amount paise={t.debit} size="sm" /> : <Amount paise={t.credit} size="sm" tone="muted" />}
                  <span className="ml-1 text-[10.5px] text-faint">{t.debit ? "Dr" : "Cr"}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11.5px] text-faint">
            Amounts and accounts come from code; only narrations are prose. GST on fees is claimable as ITC (GSTR-3B 4A(5)).
          </p>
        </aside>
      </div>
    </div>
  );
}

function ExportButton({ href, live, icon: Icon, label }: { href: string; live: boolean; icon: React.ElementType; label: string }) {
  if (!live) {
    return (
      <Hint label="Start the API to export">
        <span>
          <Button size="sm" disabled>
            <Icon /> {label}
          </Button>
        </span>
      </Hint>
    );
  }
  return (
    <Button asChild size="sm">
      <a href={href} download>
        <Download /> {label}
      </a>
    </Button>
  );
}
