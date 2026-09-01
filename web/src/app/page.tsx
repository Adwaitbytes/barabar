import type { Metadata } from "next";
import closePack from "@/lib/fixtures/close-pack.json";
import audit from "@/lib/fixtures/audit.json";
import type { ClosePack } from "@/lib/types";
import "@/components/landing/landing.css";
import { Preloader } from "@/components/landing/preloader";
import { LandingNav } from "@/components/landing/nav";
import { ChapterRail } from "@/components/landing/chapter-rail";
import { Hero } from "@/components/landing/hero";
import {
  ChapterLegs,
  ChapterMatch,
  ChapterNames,
  ChapterProof,
  type LandingData,
} from "@/components/landing/chapters";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: { absolute: "Barabar — every rupee explained" },
  description:
    "Reconciles Razorpay settlements, the bank statement and the sales ledger to the paise. Typed exceptions, proof trees, deterministic hashes.",
};

// The landing page shows a real captured month, never invented figures.
const pack = closePack as unknown as ClosePack;

const data: LandingData = {
  run: {
    inputs_hash: pack.run.inputs_hash,
    config_hash: pack.run.config_hash,
    outputs_hash: pack.run.outputs_hash,
    code_version: pack.run.code_version,
  },
  facts: pack.facts,
  byType: pack.exceptions_by_type,
  records: {
    payments: pack.metrics.payments,
    settlements: pack.metrics.settlements,
    bank_credits: pack.metrics.bank_credits,
    ledger_entries: pack.metrics.ledger_entries,
  },
  auditEvents: (audit as { events: unknown[] }).events.length,
};

export default function LandingPage() {
  return (
    <div className="dark bg-bg text-text">
      <a
        href="#legs"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-text focus:shadow-2"
      >
        Skip to content
      </a>
      <Preloader />
      <LandingNav />
      <ChapterRail />
      <Hero />
      <main>
        <ChapterLegs data={data} />
        <ChapterMatch />
        <ChapterNames data={data} />
        <ChapterProof data={data} />
      </main>
      <LandingFooter />
    </div>
  );
}
