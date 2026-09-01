import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { StatStrip } from "@/components/legs/stat-strip";
import { FilterChips } from "@/components/legs/filter-chips";
import { SearchBox } from "@/components/legs/search-box";
import { FocusRow } from "@/components/legs/focus-row";
import { SettlementsTable } from "@/components/settlements/settlements-table";
import { Amount } from "@/components/domain/amount";
import { activeRunId } from "@/lib/run";
import { getClosePack, getMonth } from "@/lib/api";
import { routes } from "@/lib/routes";
import { fmtInt } from "@/lib/format";
import type { ClosePackSettlement } from "@/lib/types";

export const metadata: Metadata = { title: "Settlements" };

const NEEDS_ATTENTION = new Set<ClosePackSettlement["match_status"]>([
  "proposed",
  "pending",
  "open",
  "missing",
  "failed",
  "duplicate",
  "unmatched",
]);

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function SettlementsPage({ searchParams }: PageProps<"/app/settlements">) {
  const sp = await searchParams;
  const status = first(sp.status);
  const q = first(sp.q).trim().toLowerCase();

  const runId = await activeRunId();
  const [pack, lines] = await Promise.all([getClosePack(runId), getMonth(runId, "recon_lines")]);

  // Free text reaches into the lines so a payment id or receipt finds its batch.
  const lineHits = new Set<string>();
  if (q) {
    for (const ln of lines) {
      if (!ln.settlement_id) continue;
      const hay = [ln.entity_id, ln.payment_id, ln.order_receipt, ln.order_id, ln.dispute_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (hay.includes(q)) lineHits.add(ln.settlement_id);
    }
  }

  const all = pack.settlements;
  const matched = all.filter((s) => s.match_status === "matched" || s.match_status === "split");
  const attention = all.filter((s) => NEEDS_ATTENTION.has(s.match_status));

  const rows = all.filter((s) => {
    if (status === "matched" && !(s.match_status === "matched" || s.match_status === "split")) return false;
    if (status === "attention" && !NEEDS_ATTENTION.has(s.match_status)) return false;
    if (!q) return true;
    return (
      s.settlement_id.toLowerCase().includes(q) ||
      (s.utr ?? "").toLowerCase().includes(q) ||
      lineHits.has(s.settlement_id)
    );
  });

  const processed = all.filter((s) => s.status === "processed");
  const totalNet = processed.reduce((a, s) => a + s.amount, 0);
  const totalFees = processed.reduce((a, s) => a + s.fee + s.tax, 0);
  const focus = lineHits.size === 1 ? [...lineHits][0] : undefined;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Three legs · Razorpay"
        title="Settlements"
        description="Every batch Razorpay paid out this month, its arithmetic, and which bank credit it became. Click a row for the proof."
      />

      <StatStrip
        stats={[
          {
            label: "Processed",
            value: fmtInt(processed.length),
            hint: `${fmtInt(all.length - processed.length)} created, not yet paid`,
          },
          {
            label: "Matched to bank",
            value: `${fmtInt(matched.length)} / ${fmtInt(processed.length)}`,
            hint: `${fmtInt(attention.length)} need attention`,
            tone: attention.length ? "open" : "settled",
          },
          { label: "Net paid out", value: <Amount paise={totalNet} size="lg" /> },
          {
            label: "Fees + GST",
            value: <Amount paise={totalFees} size="lg" />,
            hint: "GST on fees is claimable as ITC",
          },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          basePath={routes.settlements}
          param="status"
          current={status}
          keep={{ q: q || undefined }}
          chips={[
            { value: "all", label: "All", count: all.length },
            { value: "matched", label: "Matched", count: matched.length },
            { value: "attention", label: "Needs attention", count: attention.length },
          ]}
        />
        <SearchBox
          action={routes.settlements}
          defaultValue={first(sp.q)}
          placeholder="Settlement, UTR, payment or receipt…"
          hidden={{ status: status || undefined }}
        />
      </div>

      <FocusRow focus={focus} />
      <SettlementsTable rows={rows} highlight={lineHits} />
    </div>
  );
}
