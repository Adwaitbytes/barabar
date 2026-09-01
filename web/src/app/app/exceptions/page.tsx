import Link from "next/link";
import { cn } from "@/lib/utils";
import { activeRunId } from "@/lib/run";
import { listExceptions } from "@/lib/api";
import { EXCEPTION_SPECS, FAMILY_LABEL, type ExceptionFamily } from "@/lib/exceptions";
import { formatInr } from "@/lib/money";
import { routes } from "@/lib/routes";
import type { ExceptionStatus, ExceptionType } from "@/lib/types";
import { PageHeader } from "@/components/shell/page-header";
import { Amount } from "@/components/domain/amount";
import { ExceptionInbox } from "@/components/exceptions/inbox";

export const metadata = { title: "Exceptions" };

const STATUSES: { value: ExceptionStatus | "all"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "accepted", label: "Accepted" },
  { value: "auto_resolved", label: "Auto-resolved" },
  { value: "all", label: "All" },
];

const FAMILIES: ExceptionFamily[] = ["timing", "pricing", "refund", "dispute", "bank", "ledger", "razorpay"];

function isStatus(v: string | undefined): v is ExceptionStatus | "all" {
  return STATUSES.some((s) => s.value === v);
}
function isFamily(v: string | undefined): v is ExceptionFamily {
  return FAMILIES.includes(v as ExceptionFamily);
}
function isType(v: string | undefined): v is ExceptionType {
  return v !== undefined && v in EXCEPTION_SPECS;
}

function href(q: { status?: string; family?: string; type?: string }): string {
  const qs = new URLSearchParams();
  if (q.status && q.status !== "open") qs.set("status", q.status);
  if (q.family) qs.set("family", q.family);
  if (q.type) qs.set("type", q.type);
  const s = qs.toString();
  return s ? `${routes.exceptions}?${s}` : routes.exceptions;
}

export default async function ExceptionsPage({ searchParams }: PageProps<"/app/exceptions">) {
  const sp = await searchParams;
  const status = isStatus(first(sp.status)) ? (first(sp.status) as ExceptionStatus | "all") : "open";
  const family = isFamily(first(sp.family)) ? (first(sp.family) as ExceptionFamily) : undefined;
  const type = isType(first(sp.type)) ? (first(sp.type) as ExceptionType) : undefined;

  const runId = await activeRunId();
  const all = await listExceptions(runId);

  const byStatus = all.filter((e) => status === "all" || e.status === status);
  const open = all.filter((e) => e.status === "open");
  const openAmount = open.reduce((s, e) => s + e.amount, 0);

  const familyCounts = new Map<ExceptionFamily, { count: number; amount: number }>();
  for (const e of byStatus) {
    const f = EXCEPTION_SPECS[e.type].family;
    const cur = familyCounts.get(f) ?? { count: 0, amount: 0 };
    familyCounts.set(f, { count: cur.count + 1, amount: cur.amount + e.amount });
  }

  const visible = byStatus.filter(
    (e) => (!family || EXCEPTION_SPECS[e.type].family === family) && (!type || e.type === type),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Exceptions"
        title={
          <span className="flex items-baseline gap-3">
            <span>{open.length} open</span>
            <Amount paise={openAmount} size="xl" tone="open" />
          </span>
        }
        description="Every unmatched or partially matched rupee has exactly one primary type, a rule that raised it, and a suggested action. Unexplained is what is still open below the confidence threshold."
      />

      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-lg bg-sunken p-1 w-fit">
        {STATUSES.map((s) => {
          const n = s.value === "all" ? all.length : all.filter((e) => e.status === s.value).length;
          const active = s.value === status;
          return (
            <Link
              key={s.value}
              href={href({ status: s.value, family, type })}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                active ? "bg-surface text-text shadow-1" : "text-muted hover:text-text",
              )}
            >
              {s.label}
              <span className="mono text-[11px] text-faint">{n}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Exception families" className="lg:sticky lg:top-20 lg:self-start">
          <Link
            href={href({ status })}
            className={cn(
              "flex h-8 items-center justify-between rounded-md px-2 text-[13px]",
              !family && !type ? "bg-surface text-text shadow-1 hairline" : "text-muted hover:text-text",
            )}
          >
            All families
            <span className="mono text-[11px] text-faint">{byStatus.length}</span>
          </Link>
          <ul className="mt-1 space-y-0.5">
            {FAMILIES.map((f) => {
              const c = familyCounts.get(f);
              const active = family === f;
              return (
                <li key={f}>
                  <Link
                    href={href({ status, family: f })}
                    className={cn(
                      "flex h-8 items-center justify-between rounded-md px-2 text-[13px]",
                      active ? "bg-surface text-text shadow-1 hairline" : "text-muted hover:text-text",
                      !c && "opacity-50",
                    )}
                  >
                    <span>{FAMILY_LABEL[f]}</span>
                    <span className="mono text-[11px] text-faint" title={c ? formatInr(c.amount) : undefined}>
                      {c?.count ?? 0}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {type && (
            <div className="mt-4 rounded-md bg-raised px-2 py-1.5 text-[12px] text-muted">
              Filtered to <code className="text-text">{type}</code>{" "}
              <Link href={href({ status, family })} className="text-signal-fg underline">
                clear
              </Link>
            </div>
          )}
        </nav>

        <ExceptionInbox runId={runId} exceptions={visible} status={status} />
      </div>
    </div>
  );
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
