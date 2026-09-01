import { Amount } from "@/components/domain/amount";
import { TierBadge } from "@/components/domain/chips";
import { fmtInt } from "@/lib/format";
import type { ClosePackFacts, RunMetrics } from "@/lib/types";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="min-w-0">
        <span className="text-[13px] text-text">{label}</span>
        {hint && <span className="ml-1.5 text-[11px] text-faint">{hint}</span>}
      </dt>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}

export function ControllerFacts({ facts, metrics }: { facts: ClosePackFacts; metrics: RunMetrics }) {
  const tiers = [
    { tier: "A", n: metrics.links_tier_A },
    { tier: "B", n: metrics.links_tier_B },
    { tier: "C", n: metrics.links_tier_C },
    { tier: "D-accepted", n: metrics["links_tier_D-accepted"] },
  ] as const;

  return (
    <dl className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
      <div>
        <Row label="Payment-gateway fees">
          <Amount paise={facts.pg_fees} />
        </Row>
        <Row label="GST on fees" hint="ITC · GSTR-3B 4A(5)">
          <Amount paise={facts.gst_on_fees_itc} />
        </Row>
        <Row label="Refunds netted in batches">
          <Amount paise={-facts.refunds_netted} />
        </Row>
        <Row label="Chargebacks debited">
          <Amount paise={-facts.chargebacks_debited} />
        </Row>
      </div>
      <div>
        <Row label="Exceptions auto-resolved by rule">
          <span className="mono text-[13.5px]">
            {fmtInt(facts.exceptions_auto_resolved)}
            <span className="text-faint"> / {fmtInt(facts.exceptions_total)}</span>
          </span>
        </Row>
        <Row label="Payments matched to ledger">
          <span className="mono text-[13.5px]">
            {fmtInt(metrics.payments_with_ledger_match)}
            <span className="text-faint"> / {fmtInt(metrics.payments)}</span>
          </span>
        </Row>
        <Row label="Links by tier" hint={`${fmtInt(metrics.links_total)} total`}>
          <span className="inline-flex items-center gap-2.5">
            {tiers.map((t) => (
              <span key={t.tier} className="inline-flex items-center gap-1">
                <TierBadge tier={t.tier} />
                <span className="mono text-[12.5px] text-muted">{fmtInt(t.n)}</span>
              </span>
            ))}
          </span>
        </Row>
        <Row label="Bank credits seen">
          <span className="mono text-[13.5px]">{fmtInt(metrics.bank_credits)}</span>
        </Row>
      </div>
    </dl>
  );
}
