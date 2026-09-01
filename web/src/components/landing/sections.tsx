import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/domain/amount";
import { Band } from "@/components/domain/band";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Wordmark } from "@/components/shell/wordmark";
import { EXCEPTION_SPECS, FAMILY_LABEL, type ExceptionFamily } from "@/lib/exceptions";
import { routes } from "@/lib/routes";
import { EXCEPTION_TYPES, type ClosePack, type Tier } from "@/lib/types";
import { fmtInt } from "@/lib/format";
import { LegPanel, type LegVariant } from "./leg-panel";

/* ---------- shared ---------- */

function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  className,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn("mx-auto w-full max-w-6xl scroll-mt-16 px-5 py-20 sm:px-8 sm:py-28", className)}
    >
      <div className="mb-12 max-w-2xl">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-faint">{eyebrow}</p>
        <h2
          id={id ? `${id}-title` : undefined}
          className="text-[clamp(28px,4vw,44px)] font-semibold leading-[1.05] tracking-[-0.03em] text-text"
        >
          {title}
        </h2>
        {lede && <p className="mt-4 text-[16px] leading-relaxed text-muted">{lede}</p>}
      </div>
      {children}
    </section>
  );
}

/* ---------- 1. three legs ---------- */

const LEGS: { variant: LegVariant; name: string; source: string; reads: string; detail: string }[] = [
  {
    variant: "layers",
    name: "Razorpay settlements",
    source: "Settlements API · recon lines",
    reads: "Every batch as gross − fee − tax, line by line.",
    detail:
      "Payments, refunds, disputes and adjustments exactly as Razorpay reports them, with the UTR the batch went out on.",
  },
  {
    variant: "nodes",
    name: "Bank statement",
    source: "HDFC · ICICI · SBI · Axis · Kotak · RazorpayX",
    reads: "A narration grammar per bank recovers the UTR.",
    detail:
      "Truncated UTRs, split credits and holiday-shifted dates are recognised by rule, then matched to the paise.",
  },
  {
    variant: "flow",
    name: "Sales ledger",
    source: "Tally · Zoho · CSV",
    reads: "Invoices tied back to payments by receipt.",
    detail:
      "Orphans, duplicates and amount mismatches become typed exceptions with the journal entry already drafted.",
  },
];

export function ThreeLegs() {
  return (
    <Section
      id="product"
      eyebrow="Three sources"
      title="Three legs, one number."
      lede="A close is only done when the gateway, the bank and the books agree. Barabar reads all three and returns one figure: how many rupees are explained, and a name for each one that is not."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {LEGS.map((leg, i) => (
          <article
            key={leg.variant}
            className="group flex flex-col overflow-hidden rounded-xl bg-surface hairline shadow-1 transition-shadow hover:shadow-2"
          >
            <LegPanel variant={leg.variant} className="rounded-none" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-text">{leg.name}</h3>
                <span className="mono text-[11px] text-faint">leg {i + 1}</span>
              </div>
              <p className="text-[13px] font-medium text-text">{leg.reads}</p>
              <p className="text-[13px] leading-relaxed text-muted">{leg.detail}</p>
              <p className="mono mt-auto pt-2 text-[11px] text-faint">{leg.source}</p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ---------- 2. exceptions ---------- */

const FAMILY_ORDER: ExceptionFamily[] = ["timing", "bank", "pricing", "refund", "dispute", "ledger", "razorpay"];

const FAMILY_BORDER: Record<ExceptionFamily, string> = {
  timing: "border-l-signal",
  pricing: "border-l-open",
  refund: "border-l-open",
  dispute: "border-l-critical",
  bank: "border-l-critical",
  ledger: "border-l-signal",
  razorpay: "border-l-line-strong",
};

export function ExceptionsGrid() {
  const autoCount = EXCEPTION_TYPES.filter((t) => EXCEPTION_SPECS[t].auto).length;
  return (
    <Section
      id="exceptions"
      eyebrow={`${EXCEPTION_TYPES.length} typed exceptions · ${autoCount} auto-resolved by rule`}
      title="Every unmatched rupee gets a name."
      lede="“Unexplained” is not a bucket. It is the sum of open exceptions below the confidence threshold. Each one carries a detection rule, a suggested action and the evidence that produced it."
    >
      <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {FAMILY_ORDER.map((family) => {
          const types = EXCEPTION_TYPES.filter((t) => EXCEPTION_SPECS[t].family === family);
          return (
            <div key={family}>
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                {FAMILY_LABEL[family]}
                <span className="mono ml-2 text-faint/70">{types.length}</span>
              </h3>
              <ul className="space-y-1.5">
                {types.map((t) => {
                  const spec = EXCEPTION_SPECS[t];
                  return (
                    <li
                      key={t}
                      className={cn(
                        "flex items-center gap-3 rounded-r-md border-l-2 bg-surface py-2 pl-3 pr-3 hairline",
                        FAMILY_BORDER[family],
                      )}
                      title={spec.meaning}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-text">{spec.title}</span>
                        <code className="block truncate text-[10.5px] text-faint">{t}</code>
                      </span>
                      {spec.auto && (
                        <Badge tone="settled" className="shrink-0">
                          auto
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- 3. determinism ---------- */

const TIERS: { tier: Tier; name: string; rule: string; means: string }[] = [
  { tier: "A", name: "Exact", rule: "A1-UTR-EXACT · A4-RECEIPT-LEDGER", means: "Identifiers agree. UTR to UTR, receipt to receipt. Confidence 1.0." },
  { tier: "B", name: "Arithmetic", rule: "B1-BATCH-NET · B2-GROSS-FEE-TAX-DECOMP", means: "The sum closes. Gross − fee − GST − refunds equals the credit, to the paise." },
  { tier: "C", name: "Bounded fuzzy", rule: "C1-UTR-PREFIX · C2-SPLIT-SUBSET", means: "Prefix, amount and date window. Capped at 0.85 and always shown as a proposal." },
  { tier: "D", name: "Accepted", rule: "person:accept", means: "A person decided. Recorded in the audit chain with actor and note." },
];

export function Determinism({ run, auditEvents }: { run: ClosePack["run"]; auditEvents: number }) {
  const hashes = [
    {
      key: "inputs_hash",
      value: run.inputs_hash,
      what: "Canonical hash of the month: every payment, bank row and invoice.",
    },
    {
      key: "config_hash",
      value: run.config_hash,
      what: "Every tolerance and window. Change one paise of tolerance and this changes.",
    },
    {
      key: "outputs_hash",
      value: run.outputs_hash ?? "",
      what: "Links, exceptions and proof trees. Re-run the same inputs and this is identical.",
    },
  ];
  return (
    <Section
      id="determinism"
      eyebrow="Deterministic core"
      title="Same inputs, same answer, same hash."
      lede="No language model touches a match. The matcher is three deterministic tiers; the AI is only asked to investigate the tail, and its evidence is hashed into the same audit chain."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {hashes.map((h) => (
          <div key={h.key} className="rounded-xl bg-surface p-5 hairline shadow-1">
            <div className="mb-3 flex items-center justify-between">
              <code className="text-[11px] uppercase tracking-[0.1em] text-faint">{h.key}</code>
              <Badge tone="neutral">sha-256</Badge>
            </div>
            <code className="block break-all text-[12px] leading-relaxed text-text">{h.value}</code>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">{h.what}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl bg-surface hairline shadow-1">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="px-5 py-3 font-medium">Tier</th>
                <th className="px-3 py-3 font-medium">Rules</th>
                <th className="px-5 py-3 font-medium">What it means</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.tier} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 align-top">
                    <span className="inline-flex items-center gap-2">
                      <Badge
                        tone={t.tier === "A" ? "settled" : t.tier === "B" ? "signal" : t.tier === "C" ? "open" : "outline"}
                        className="mono"
                      >
                        {t.tier}
                      </Badge>
                      <span className="font-medium text-text">{t.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <code className="text-[11px] text-muted">{t.rule}</code>
                  </td>
                  <td className="px-5 py-3 align-top text-muted">{t.means}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col justify-between rounded-xl bg-surface p-5 hairline shadow-1">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">Audit chain</p>
            <p className="mono mt-2 text-[40px] leading-none tracking-[-0.03em] text-text">
              {fmtInt(auditEvents)}
            </p>
            <p className="mt-1 text-[13px] text-muted">hash-linked events in this run, verified end to end</p>
          </div>
          <dl className="mt-6 space-y-2 text-[13px]">
            <div className="flex items-center justify-between border-t border-line pt-2">
              <dt className="text-muted">Head</dt>
              <dd className="mono text-text">{run.outputs_hash?.slice(0, 16) ?? "—"}…</dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <dt className="text-muted">Code version</dt>
              <dd className="mono text-text">{run.code_version}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <dt className="text-muted">Replay</dt>
              <dd className="inline-flex items-center gap-1.5 text-settled-fg">
                <span className="size-1.5 rounded-full bg-settled" />
                identical outputs
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 4. close pack ---------- */

export function ClosePackSection({ pack }: { pack: ClosePack }) {
  const f = pack.facts;
  const stats: { label: string; value: React.ReactNode; note?: string }[] = [
    { label: "Gross captured", value: <Amount paise={f.gross_captured} size="xl" />, note: "through Razorpay" },
    {
      label: "Explained to the paise",
      value: <span className="mono text-2xl tracking-[-0.01em] text-settled-fg">{f.rupees_explained_pct.toFixed(2)}%</span>,
      note: <Amount paise={f.explained} tone="muted" size="sm" />,
    },
    { label: "PG fees", value: <Amount paise={f.pg_fees} size="xl" />, note: "for the period" },
    { label: "GST on fees, claimable ITC", value: <Amount paise={f.gst_on_fees_itc} size="xl" />, note: "GSTR-3B 4A(5)" },
    {
      label: "Typed exceptions",
      value: <span className="mono text-2xl tracking-[-0.01em] text-text">{f.exceptions_total}</span>,
      note: `${f.exceptions_auto_resolved} auto-resolved · ${f.exceptions_open} open`,
    },
    {
      label: "Settlements matched to bank",
      value: (
        <span className="mono text-2xl tracking-[-0.01em] text-text">
          {f.settlements_matched}
          <span className="text-faint">/{f.settlements_processed}</span>
        </span>
      ),
      note: "processed this month",
    },
  ];

  return (
    <Section
      id="close-pack"
      eyebrow={`Close pack · as of ${f.as_of}`}
      title="The close pack."
      lede="One page a controller can sign. Headline figures, the calendar of expected versus actual credits, every exception with its action, and the journal entries drafted. Every number below is from a real run, none of it estimated."
    >
      <TooltipProvider>
        <div className="rounded-xl bg-surface p-6 hairline shadow-1 sm:p-8">
          <Band
            explained={f.explained}
            open={0}
            unexplained={f.unexplained}
            size="md"
            showLegend
          />
          <dl className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="border-t border-line pt-4">
                <dt className="text-[12px] text-muted">{s.label}</dt>
                <dd className="mt-1.5">{s.value}</dd>
                {s.note && <dd className="mt-1 text-[12px] text-faint">{s.note}</dd>}
              </div>
            ))}
          </dl>
        </div>
      </TooltipProvider>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button asChild variant="primary" size="lg">
          <Link href={routes.overview}>
            Open the close pack
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <span className="text-[13px] text-muted">
          Runs on a captured month if the API is off, on live data when it is on.
        </span>
      </div>
    </Section>
  );
}

/* ---------- footer ---------- */

export function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-sm">
          <Wordmark size="lg" />
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Deterministic where money is decided. AI only on the tail.
          </p>
          <p className="mt-1 text-[12px] text-faint">Built for Razorpay merchants in India.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
          <Link href={routes.overview} className="text-muted transition-colors hover:text-text">
            Open app
          </Link>
          <a href="#determinism" className="text-muted transition-colors hover:text-text">
            How matching works
          </a>
          <a href="#exceptions" className="text-muted transition-colors hover:text-text">
            Exception taxonomy
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-muted transition-colors hover:text-text"
          >
            GitHub
          </a>
        </nav>
      </div>
      <div className="mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
        <p className="mono text-[11px] text-faint">integer paise · RBI settlement calendar · sha-256 audit chain · MIT</p>
      </div>
    </footer>
  );
}
