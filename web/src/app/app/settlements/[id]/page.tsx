import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Amount } from "@/components/domain/amount";
import { MatchStatusPill } from "@/components/domain/chips";
import { CopyButton } from "@/components/domain/copy-button";
import { EmptyState } from "@/components/shell/page-header";
import { ProofTree } from "@/components/proof/proof-tree";
import { ArithmeticCard } from "@/components/proof/arithmetic-card";
import { ExceptionsCard, LinksCard } from "@/components/proof/side-cards";
import { activeRunId } from "@/lib/run";
import { getClosePack, getProof, listExceptions, listLinks } from "@/lib/api";
import { fmtDate, fmtDateTime, weekday } from "@/lib/format";
import { routes } from "@/lib/routes";

export async function generateMetadata({ params }: PageProps<"/app/settlements/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Proof · ${id}` };
}

export default async function SettlementProofPage({ params }: PageProps<"/app/settlements/[id]">) {
  const { id } = await params;
  const runId = await activeRunId();
  const selfRef = `settlement:${id}`;

  const [pack, proof, links, exceptions] = await Promise.all([
    getClosePack(runId),
    getProof(runId, id),
    listLinks(runId, selfRef),
    listExceptions(runId),
  ]);
  const s = pack.settlements.find((x) => x.settlement_id === id);
  if (!s) notFound();

  const onThis = exceptions.filter((e) => e.entities.includes(selfRef));
  const bankNodes = proof?.children.filter((c) => c.kind === "bank") ?? [];
  const bankAmount = bankNodes.length ? bankNodes.reduce((a, n) => a + (n.amount ?? 0), 0) : null;
  const hasBank = bankNodes.length > 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href={routes.settlements}
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-text"
      >
        <ArrowLeft className="size-3.5" />
        Settlements
      </Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-faint">
            Why did this land in the bank?
          </div>
          <div className="flex items-center gap-2">
            <h1 className="mono text-[22px] font-semibold tracking-[-0.01em] text-text">{s.settlement_id}</h1>
            <CopyButton value={s.settlement_id} label="Copy settlement id" />
            <MatchStatusPill status={s.match_status} />
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
            <div className="flex gap-1.5">
              <dt className="text-faint">UTR</dt>
              <dd className="mono text-text">{s.utr ?? ", "}</dd>
              {s.utr && <CopyButton value={s.utr} label="Copy UTR" className="-my-1 size-5" />}
            </div>
            <div className="flex gap-1.5">
              <dt className="text-faint">Mode</dt>
              <dd className="mono text-text">{s.mode}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-faint">Type</dt>
              <dd>
                <Badge tone={s.type === "instant" ? "signal" : s.type === "partial" ? "outline" : "neutral"}>{s.type}</Badge>
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-faint">Processed</dt>
              <dd className="text-text">
                {s.settled_at ? fmtDateTime(s.settled_at) : `${fmtDate(s.settled_on)} (created)`}
                <span className="ml-1 text-faint">{weekday(s.settled_on)} IST</span>
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-faint">Lines</dt>
              <dd className="mono text-text">{s.lines}</dd>
            </div>
          </dl>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-faint">Net to bank</div>
          <Amount paise={s.amount} size="xl" tone={hasBank ? "settled" : "default"} />
          {bankAmount !== null && bankAmount !== s.amount && (
            <div className="mt-0.5 text-[12px] text-muted">
              bank received <Amount paise={bankAmount} size="sm" tone="settled" />
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Proof tree" className="min-w-0">
          {proof ? (
            <>
              {!hasBank && (
                <div className="mb-3 rounded-lg bg-open-dim/50 px-4 py-3 text-[13px] text-open-fg hairline">
                  No bank credit is linked to this settlement yet. The batch arithmetic below still holds;
                  the open exception explains what the bank statement is missing.
                </div>
              )}
              <ProofTree root={proof} bankAmount={bankAmount} />
            </>
          ) : (
            <EmptyState
              title="No bank credit linked"
              body="The matcher found no UTR, split, calendar shift or fuzzy candidate for this settlement. The exceptions on the right say what to do next."
            />
          )}
        </section>

        <aside className="space-y-4">
          {proof && <ArithmeticCard root={proof} settlementNet={s.amount} bankAmount={bankAmount} />}
          <LinksCard links={links} selfRef={selfRef} />
          <ExceptionsCard items={onThis} />
        </aside>
      </div>
    </div>
  );
}
