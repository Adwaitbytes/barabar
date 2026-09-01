import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, FileText } from "lucide-react";
import { activeRunId } from "@/lib/run";
import { exportUrl, getClosePack, listExceptions, source } from "@/lib/api";
import { closeMonth, fmtDate, fmtInt } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Amount } from "@/components/domain/amount";
import { Band } from "@/components/domain/band";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { SettlementCalendar } from "@/components/overview/settlement-calendar";
import { RerunButton } from "@/components/overview/rerun-button";
import { NeedsHuman } from "@/components/overview/needs-human";
import { ControllerFacts } from "@/components/overview/facts";
import { RecentSettlements } from "@/components/overview/recent-settlements";
import { DeterminismStrip } from "@/components/overview/determinism-strip";
import { CountUp, NumberTicker, Reveal, Stagger } from "@/components/motion";

export const metadata: Metadata = { title: "Close pack" };

export default async function ClosePackPage() {
  const runId = await activeRunId();
  const [pack, exceptions, src] = await Promise.all([
    getClosePack(runId),
    listExceptions(runId),
    source(),
  ]);
  const { run, headline, facts, metrics } = pack;

  const openConfident = exceptions
    .filter((e) => e.status === "open" && e.confidence >= 0.92)
    .reduce((s, e) => s + e.amount, 0);
  const explained = Math.max(headline.explained - openConfident, 0);
  const unexplainedTone = headline.unexplained > 0 ? "critical" : "settled";

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={`Close pack · ${closeMonth(run.as_of)}`}
        title={run.name}
        description={
          <>
            Reconciled as of {fmtDate(run.as_of, { withYear: true })}.{" "}
            {src === "demo" ? (
              <span className="text-faint">Showing captured demo data; start the API to act on a live run.</span>
            ) : (
              <span>Every figure below is taken from the run&apos;s structured metrics.</span>
            )}
          </>
        }
        actions={
          <>
            <RerunButton runId={run.run_id} />
            <Button asChild variant="primary" size="sm">
              <a href={exportUrl(run.run_id, "memo.md")} target="_blank" rel="noreferrer">
                <FileText />
                Export memo
              </a>
            </Button>
          </>
        }
      />

      {/* Headline */}
      <section aria-labelledby="headline" className="mb-8">
        <h2 id="headline" className="sr-only">
          Headline
        </h2>
        <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]" gap={0.09} amount={0.05}>
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-faint">Unexplained</div>
            <div className="mt-2">
              <CountUp paise={headline.unexplained} size="display" tone={unexplainedTone} duration={1.4} />
            </div>
            <div className="mt-2 text-[13px] text-muted">
              of <Amount paise={headline.gross_captured} tone="muted" /> gross captured
            </div>
          </div>
          <Stat
            label="Explained to the paise"
            value={<CountUp paise={headline.explained} size="xl" tone="settled" />}
            caption={`${headline.rupees_explained_pct.toFixed(2)}% of gross`}
          />
          <Stat
            label="Open exceptions"
            value={
              <span className="mono text-2xl tracking-[-0.01em] text-text">
                <NumberTicker value={pack.exceptions_open} />
                <span className="text-base text-faint"> / {fmtInt(pack.exceptions_total)}</span>
              </span>
            }
            caption={
              <>
                <Amount paise={facts.open_amount} tone="muted" size="sm" /> awaiting a decision
              </>
            }
          />
          <Stat
            label="Settlements matched"
            value={
              <span className="mono text-2xl tracking-[-0.01em] text-text">
                <NumberTicker value={facts.settlements_matched} />
                <span className="text-base text-faint"> / {fmtInt(facts.settlements_processed)}</span>
              </span>
            }
            caption="processed batches with a bank credit"
          />
        </Stagger>
        <Band
          explained={explained}
          open={openConfident}
          unexplained={headline.unexplained}
          size="md"
          showLegend
          className="mt-6"
        />
      </section>

      {/* Calendar */}
      <Reveal>
      <Card className="mb-6">
        <CardHeader>
          <div>
            <CardTitle>Settlement calendar</CardTitle>
            <p className="mt-0.5 text-[12px] text-faint">
              What Razorpay processed on each value date against what landed in the bank.
            </p>
          </div>
          <Link href={routes.settlements} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-signal-fg">
            All settlements <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardBody>
          <SettlementCalendar days={pack.calendar} />
        </CardBody>
      </Card>
      </Reveal>

      <Stagger className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]" gap={0.12} itemClassName="min-w-0">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>What still needs a human</CardTitle>
              <p className="mt-0.5 text-[12px] text-faint">Open exceptions by type, largest rupees first.</p>
            </div>
            <Link href={routes.exceptions} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-signal-fg">
              Open inbox <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardBody className="px-2 pb-2">
            <NeedsHuman byType={pack.exceptions_by_type} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Controller&apos;s facts</CardTitle>
              <p className="mt-0.5 text-[12px] text-faint">The numbers that go into the memo and the GST return.</p>
            </div>
          </CardHeader>
          <CardBody>
            <ControllerFacts facts={facts} metrics={metrics} />
          </CardBody>
        </Card>
      </Stagger>

      <Reveal>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent settlements</CardTitle>
          <Link href={routes.settlements} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-signal-fg">
            All {fmtInt(pack.settlements.length)} settlements <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardBody className="px-2 pb-2">
          <RecentSettlements settlements={pack.settlements} />
        </CardBody>
      </Card>
      </Reveal>

      <Reveal>
        <DeterminismStrip run={run} />
      </Reveal>
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
}: {
  label: string;
  value: React.ReactNode;
  caption: React.ReactNode;
}) {
  return (
    <div className="border-l border-line pl-5">
      <div className="text-[12px] font-medium uppercase tracking-[0.1em] text-faint">{label}</div>
      <div className="mt-2 leading-none">{value}</div>
      <div className="mt-2 text-[12.5px] text-muted">{caption}</div>
    </div>
  );
}
