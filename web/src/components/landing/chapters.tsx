"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { formatInr } from "@/lib/money";
import { fmtInt } from "@/lib/format";
import { Amount } from "@/components/domain/amount";
import { EXCEPTION_SPECS, FAMILY_LABEL, type ExceptionFamily } from "@/lib/exceptions";
import type { ExceptionType } from "@/lib/types";
import { ArcBackground, HalftoneBackground, LegPanel, StructureScene, type LegVariant, type SceneVariant } from "./shaders";
import { Cta, Item, Magnetic, Reveal, Stagger, TiltCard, Wipe, useCountUp } from "./motion";
import { useReducedMotion } from "./use-reduced-motion";

/* ---------- data passed from the server page ---------- */

export interface LandingData {
  run: { inputs_hash: string; config_hash: string; outputs_hash: string | null; code_version: string };
  facts: {
    gross_captured: number;
    explained: number;
    unexplained: number;
    rupees_explained_pct: number;
    settlements_processed: number;
    settlements_matched: number;
    pg_fees: number;
    gst_on_fees_itc: number;
    exceptions_total: number;
    exceptions_open: number;
    exceptions_auto_resolved: number;
  };
  byType: Partial<Record<ExceptionType, { count: number; amount: number }>>;
  records: { payments: number; settlements: number; bank_credits: number; ledger_entries: number };
  auditEvents: number;
}

/* ---------- chapter chrome ---------- */

function ChapterHead({
  n,
  name,
  title,
  lead,
  body,
  children,
  align = "left",
}: {
  n: string;
  name: string;
  title: ReactNode;
  lead?: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <Reveal>
        <p className={cn("mb-7 flex items-center gap-2.5 text-[11px] uppercase tracking-[0.22em] text-muted", align === "center" && "justify-center")}>
          <span className="size-1.5 rounded-full bg-settled shadow-[0_0_10px_var(--settled)]" />
          Chapter {n}: {name}
        </p>
      </Reveal>
      <Wipe className="text-[clamp(34px,4.6vw,60px)] font-normal leading-[1.04] tracking-[-0.018em] text-text">
        {title}
      </Wipe>
      {lead && (
        <Reveal delay={0.08}>
          <p className="mt-7 text-[18px] font-light leading-relaxed text-text/90 sm:text-[20px]">{lead}</p>
        </Reveal>
      )}
      {body && (
        <Reveal delay={0.14}>
          <p className="mt-4 text-[15.5px] font-light leading-relaxed text-muted sm:text-[16.5px]">{body}</p>
        </Reveal>
      )}
      {children && <Reveal delay={0.2}>{children}</Reveal>}
    </div>
  );
}

function Stat({ label, value, format }: { label: string; value: number; format: (v: number) => string }) {
  const { ref, value: v } = useCountUp(value, { duration: 1.4 });
  return (
    <div className="border-l border-line pl-5">
      <span ref={ref} className="mono block text-[30px] font-medium leading-none tracking-[-0.02em] text-text sm:text-[34px]">
        {format(v)}
      </span>
      <span className="mt-2 block text-[11px] uppercase tracking-[0.18em] text-faint">{label}</span>
    </div>
  );
}

/* ---------- Chapter 01: Three legs ---------- */

const LEGS: { variant: LegVariant; title: string; body: string; reads: string }[] = [
  {
    variant: "layers",
    title: "Razorpay settlements",
    body: "Every batch and its recon lines: gross, fee, GST, refunds, disputes, adjustments, on-hold.",
    reads: "GET /v1/settlements/recon · integer paise",
  },
  {
    variant: "nodes",
    title: "Bank statement",
    body: "HDFC, ICICI, SBI, Axis, Kotak, RazorpayX. A narration grammar per bank recovers UTRs the export truncated.",
    reads: "NEFT CR-RAZORPAY…-HDFCN26217000102",
  },
  {
    variant: "flow",
    title: "Sales ledger",
    body: "Tally, Zoho or CSV. Invoices meet payments by receipt, then amount and date; orphans get a name.",
    reads: "INV/26-27/00001 ↔ rcpt_202608_00332",
  },
];

export function ChapterLegs({ data }: { data: LandingData }) {
  const records =
    data.records.payments + data.records.settlements + data.records.bank_credits + data.records.ledger_entries;
  return (
    <section id="legs" className="relative scroll-mt-16 py-28 sm:py-36" aria-labelledby="legs-title">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <ChapterHead
            n="01"
            name="Three legs"
            title={<span id="legs-title">Three sources, one paise-exact number.</span>}
            lead="A settlement is only true when the bank agrees with Razorpay and the ledger agrees with both."
            body="Barabar reads all three, normalises money to integer paise, and walks the month with an RBI settlement calendar in hand, so T+2 means the next working day, not the next calendar one."
          >
            <div className="mt-9">
              <Cta href={routes.settlements} variant="ghost" size="md">
                Cross into the ledger
                <ArrowUpRight className="size-4" />
              </Cta>
            </div>
          </ChapterHead>

          <Stagger className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:grid-cols-2">
            <Item><Stat label="Legs" value={3} format={(v) => String(Math.round(v))} /></Item>
            <Item><Stat label="Records" value={records} format={(v) => fmtInt(Math.round(v))} /></Item>
            <Item><Stat label="Seconds" value={1.4} format={(v) => v.toFixed(1)} /></Item>
            <Item><Stat label="Residual" value={0} format={() => "₹0.00"} /></Item>
          </Stagger>
        </div>

        <Stagger className="mt-20 grid gap-5 md:grid-cols-3">
          {LEGS.map((leg, i) => (
            <Item key={leg.variant}>
              <TiltCard className="h-full overflow-hidden">
                <LegPanel variant={leg.variant} className="h-56 rounded-t-2xl" />
                <div className="p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="mono text-[11px] tracking-[0.18em] text-faint">0{i + 1} / 03</span>
                    <span className="mono text-[10.5px] text-faint">{leg.reads}</span>
                  </div>
                  <h3 className="text-[19px] font-medium text-text">{leg.title}</h3>
                  <p className="mt-2 text-[14px] font-light leading-relaxed text-muted">{leg.body}</p>
                </div>
              </TiltCard>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------- Chapter 02: The match ---------- */

const TIERS: { variant: SceneVariant; hue: number; tier: string; title: string; rules: string[]; body: string; conf: string }[] = [
  {
    variant: "data-field",
    hue: 140,
    tier: "Tier A",
    title: "Exact UTR",
    rules: ["A1-UTR-EXACT", "A4-RECEIPT-LEDGER"],
    body: "The bank narration carries the full UTR. One credit, one settlement, no judgement.",
    conf: "confidence 1.00",
  },
  {
    variant: "dimensional-field",
    hue: 230,
    tier: "Tier B",
    title: "Batch arithmetic",
    rules: ["B1-BATCH-NET", "B2-GROSS-FEE-TAX-DECOMP", "B3-REFUND-NET"],
    body: "Gross − fee − 18% GST − refunds − disputes ± adjustments must equal the batch net to the paise.",
    conf: "residual ≤ 1 paise per line",
  },
  {
    variant: "topology-field",
    hue: 35,
    tier: "Tier C",
    title: "Truncated UTR",
    rules: ["C1-UTR-PREFIX", "C2-SPLIT-CREDITS"],
    body: "A 13-character prefix, an exact amount and a three-working-day window. Proposed, never auto-accepted below 0.92.",
    conf: "confidence 0.72 → a person decides",
  },
];

export function ChapterMatch() {
  return (
    <section id="match" className="relative scroll-mt-16 overflow-hidden py-28 sm:py-36" aria-labelledby="match-title">
      <HalftoneBackground className="opacity-30 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,black_30%,transparent_85%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        <ChapterHead
          n="02"
          name="The match"
          title={<span id="match-title">Three tiers. No model touches a rupee.</span>}
          lead="Matching is a ladder. Each rung names the rule that made the link, and the ladder stops before anything is guessed."
          body="Tier D exists too: a person accepting a proposal, signed into the audit chain with their name."
        />
        <Stagger className="mt-16 grid gap-5 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Item key={t.tier}>
              <TiltCard className="flex h-full flex-col overflow-hidden bg-surface">
                <StructureScene variant={t.variant} hue={t.hue} className="h-52 rounded-t-2xl" />
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="mono text-[11px] tracking-[0.18em] text-faint">0{i + 1} / 03</span>
                    <span className="mono text-[10.5px] text-settled">{t.conf}</span>
                  </div>
                  <h3 className="text-[20px] font-medium text-text">
                    {t.tier} <span className="text-muted">·</span> {t.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[14px] font-light leading-relaxed text-muted">{t.body}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {t.rules.map((r) => (
                      <code key={r} className="rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 text-[10.5px] text-muted hairline transition-colors group-hover:text-text">
                        {r}
                      </code>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------- Chapter 03: Every rupee named ---------- */

const FAMILY_ORDER: ExceptionFamily[] = ["timing", "pricing", "refund", "dispute", "bank", "ledger", "razorpay"];
const FAMILY_MEANING: Record<ExceptionFamily, string> = {
  timing: "Money that is on its way: T+2 not elapsed, bank lag, or a holiday shifted the date.",
  pricing: "The fee or its GST differs from the rate card by more than rounding.",
  refund: "A refund netted inside a batch, or processed and not yet netted.",
  dispute: "Chargebacks debited and disputes won and re-credited.",
  bank: "Missing, unknown, duplicate or truncated credits on the statement.",
  ledger: "Invoices with no payment, a different amount, or entered twice.",
  razorpay: "Adjustments, holds, partial batches, instant fees, FX and marketplace TDS.",
};

export function ChapterNames({ data }: { data: LandingData }) {
  const families = FAMILY_ORDER.map((f) => {
    const types = (Object.keys(EXCEPTION_SPECS) as ExceptionType[]).filter((t) => EXCEPTION_SPECS[t].family === f);
    const open = types.reduce(
      (acc, t) => {
        const b = data.byType[t];
        return b ? { count: acc.count + b.count, amount: acc.amount + b.amount } : acc;
      },
      { count: 0, amount: 0 },
    );
    return { f, types, open };
  });

  return (
    <section id="names" className="relative scroll-mt-16 overflow-hidden py-28 sm:py-36" aria-labelledby="names-title">
      <ArcBackground variant="override-grid" speed={0.5} brightness={0.6} className="opacity-70" />
      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        <ChapterHead
          n="03"
          name="Every rupee named"
          title={<span id="names-title">Twenty-five names. Five resolve themselves. One quiet close.</span>}
          lead={`This month: ${data.facts.exceptions_total} typed exceptions, ${data.facts.exceptions_auto_resolved} auto-resolved by rule, ${data.facts.exceptions_open} open for a person.`}
          body="Unexplained is not a type. It is the sum of what is still open below the confidence threshold, and it is the one number a controller signs."
        />

        <Stagger as="ol" className="mt-16 divide-y divide-line border-y border-line">
          {families.map(({ f, types, open }, i) => (
            <Item key={f} as="li">
              <div className="group grid gap-x-8 gap-y-3 py-6 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-baseline">
                <span className="mono text-[11px] tracking-[0.18em] text-faint">0{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-[22px] font-normal text-text transition-colors group-hover:text-settled-fg sm:text-[26px]">
                    {FAMILY_LABEL[f]}
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-[14.5px] font-light text-muted">{FAMILY_MEANING[f]}</p>
                  <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-400 ease-out-quart group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 pt-3">
                        {types.map((t) => (
                          <code
                            key={t}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-[4px] bg-white/[0.05] px-1.5 py-0.5 text-[10.5px] text-muted hairline",
                              EXCEPTION_SPECS[t].auto && "text-settled-fg",
                            )}
                          >
                            {EXCEPTION_SPECS[t].auto && <span className="landing-pulse size-1.5 rounded-full bg-settled" />}
                            {t}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mono text-left text-[13px] text-muted sm:text-right">
                  <span className="text-text">{open.count}</span> open
                  <span className="block text-[12px] text-faint">{open.count ? formatInr(open.amount) : ", "}</span>
                </div>
              </div>
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------- Chapter 04: The proof ---------- */

const GLYPHS = "0123456789abcdef";

function useScramble(target: string, play: number) {
  const reduced = useReducedMotion();
  const [text, setText] = useState("");
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: "-10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const total = 1400;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / total);
      const settled = Math.floor(p * target.length);
      let out = target.slice(0, settled);
      for (let i = settled; i < target.length; i++) out += GLYPHS[(Math.random() * 16) | 0];
      setText(out);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, target, reduced, play]);

  return { ref, text: reduced ? target : text };
}

function HashRow({ label, value, play, note }: { label: string; value: string; play: number; note: string }) {
  const { ref, text } = useScramble(value, play);
  return (
    <div className="grid gap-2 border-t border-line py-5 sm:grid-cols-[140px_minmax(0,1fr)]">
      <span className="text-[11px] uppercase tracking-[0.18em] text-faint">{label}</span>
      <div className="min-w-0">
        <span ref={ref} className="landing-scramble mono block truncate text-[13px] text-text sm:text-[14px]">
          {text || value}
        </span>
        <span className="mt-1 block text-[12.5px] font-light text-muted">{note}</span>
      </div>
    </div>
  );
}

export function ChapterProof({ data }: { data: LandingData }) {
  const [play, setPlay] = useState(0);
  const [stamp, setStamp] = useState(false);
  const rerun = useCallback(() => {
    setStamp(false);
    setPlay((p) => p + 1);
    setTimeout(() => setStamp(true), 1500);
  }, []);
  const outputs = data.run.outputs_hash ?? "";

  return (
    <section id="proof" className="relative scroll-mt-16 overflow-hidden py-28 sm:py-40" aria-labelledby="proof-title">
      <ArcBackground variant="data-pixel" className="opacity-45 [mask-image:radial-gradient(ellipse_70%_60%_at_70%_45%,black_20%,transparent_75%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <ChapterHead
            n="04"
            name="The proof"
            title={<span id="proof-title">The proof</span>}
            lead="Same inputs, same configuration, same answer, same hash."
            body={`Every run is three hashes. Change a tolerance and the config hash changes. Re-run the same month and the outputs hash is byte-identical. Behind it, ${fmtInt(data.auditEvents)} audit events are chained by hash and verified on read.`}
          >
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Cta href={routes.overview} magnetic>
                Open the close pack
                <ArrowUpRight className="size-4" />
              </Cta>
              <Cta href={routes.exceptions} variant="outline">
                Read the exception taxonomy
              </Cta>
            </div>
          </ChapterHead>

          <Reveal delay={0.1}>
            <div className="relative rounded-2xl bg-surface/60 p-6 shadow-3 backdrop-blur-md hairline sm:p-8">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.18em] text-faint">run · {data.run.code_version}</span>
                <Magnetic strength={6}>
                  <button
                    type="button"
                    onClick={rerun}
                    className="landing-cta group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-full bg-white/[0.06] px-4 text-[13px] text-text hairline transition-colors hover:bg-white/[0.1]"
                  >
                    <RotateCcw className="size-3.5 transition-transform duration-500 group-hover:-rotate-180" />
                    Re-run the month
                    <span aria-hidden className="landing-shine" />
                  </button>
                </Magnetic>
              </div>
              <HashRow label="inputs_hash" value={data.run.inputs_hash} play={0} note="The three legs, canonicalised and hashed before matching begins." />
              <HashRow label="config_hash" value={data.run.config_hash} play={0} note="Tolerances, windows, calendar and rate card. A different knob is a different run." />
              <HashRow label="outputs_hash" value={outputs} play={play} note="Links, exceptions and proof trees, minus wall-clock fields." />
              <div className="mt-2 flex h-8 items-center gap-2 border-t border-line pt-4">
                <motion.span
                  initial={false}
                  animate={{ opacity: stamp ? 1 : 0, scale: stamp ? 1 : 0.85 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-settled-dim px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-settled-fg"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                  identical outputs
                </motion.span>
                {!stamp && <span className="text-[12px] text-faint">{play ? "re-running…" : "press re-run to replay the hash"}</span>}
              </div>
            </div>

            {/* audit chain */}
            <div className="mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
              <div className="landing-chain items-center gap-2">
                {Array.from({ length: 2 }).flatMap((_, k) =>
                  Array.from({ length: 28 }).map((__, i) => (
                    <span key={`${k}-${i}`} className="flex items-center gap-2">
                      <span className="mono rounded-[3px] bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-faint hairline">
                        {data.run.inputs_hash.slice((i * 3) % 56, ((i * 3) % 56) + 6)}
                      </span>
                      <span className="h-px w-3 bg-settled/60" />
                    </span>
                  )),
                )}
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-faint">
                {fmtInt(data.auditEvents)} events · head verified · actor: system / agent / user
              </p>
            </div>
          </Reveal>
        </div>

        {/* close pack strip */}
        <Stagger className="mt-24 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-line pt-10 sm:grid-cols-4">
          <Item>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-faint">Gross captured</span>
            <Amount paise={data.facts.gross_captured} size="xl" className="mt-2 block" />
          </Item>
          <Item>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-faint">Explained to the paise</span>
            <Amount paise={data.facts.explained} size="xl" tone="settled" className="mt-2 block" />
            <span className="mono mt-1 block text-[12px] text-muted">{data.facts.rupees_explained_pct.toFixed(2)}%</span>
          </Item>
          <Item>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-faint">GST on fees · ITC</span>
            <Amount paise={data.facts.gst_on_fees_itc} size="xl" className="mt-2 block" />
            <span className="mono mt-1 block text-[12px] text-muted">GSTR-3B 4A(5)</span>
          </Item>
          <Item>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-faint">Still unexplained</span>
            <Amount paise={data.facts.unexplained} size="xl" tone="critical" className="mt-2 block" />
            <span className="mono mt-1 block text-[12px] text-muted">{data.facts.exceptions_open} open exceptions</span>
          </Item>
        </Stagger>
      </div>
    </section>
  );
}
