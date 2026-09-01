import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Amount, Delta } from "@/components/domain/amount";
import { cn } from "@/lib/utils";
import type { ProofNode } from "@/lib/types";

interface Line {
  label: string;
  paise: number;
  op: "" | "−" | "+" | "±" | "=";
  emphasis?: boolean;
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

/**
 * gross − fee − GST − refunds − disputes ± adjustments = net, read off the
 * tree's group nodes. The numbers are the backend's; nothing is recomputed.
 */
export function arithmeticFor(root: ProofNode): { lines: Line[]; sigma: number | null } {
  const settlement = root.children.find((c) => c.kind === "settlement");
  const groups = settlement?.children.filter((c) => c.kind === "group") ?? [];
  const sigma = settlement?.children.find((c) => c.kind === "note")?.amount ?? null;

  const lines: Line[] = [];
  let refunds = 0;
  let disputes = 0;
  let adjustments = 0;
  for (const g of groups) {
    const label = g.label.toLowerCase();
    if (label.includes("payment")) {
      lines.push({ label: "Gross captured", paise: num(g.meta.gross), op: "" });
      lines.push({ label: "Razorpay fee", paise: num(g.meta.fee), op: "−" });
      lines.push({ label: "GST on fee (18%)", paise: num(g.meta.tax), op: "−" });
    } else if (label.includes("refund")) refunds += g.amount ?? 0;
    else if (label.includes("dispute")) disputes += g.amount ?? 0;
    else if (label.includes("adjustment")) adjustments += g.amount ?? 0;
  }
  if (refunds !== 0) lines.push({ label: "Refunds netted", paise: -refunds, op: "−" });
  if (disputes !== 0) lines.push({ label: "Disputes", paise: disputes, op: "±" });
  if (adjustments !== 0) lines.push({ label: "Adjustments", paise: adjustments, op: "±" });
  if (sigma !== null) lines.push({ label: "Batch net", paise: sigma, op: "=", emphasis: true });
  return { lines, sigma };
}

export function ArithmeticCard({
  root,
  settlementNet,
  bankAmount,
}: {
  root: ProofNode;
  settlementNet: number;
  bankAmount: number | null;
}) {
  const { lines, sigma } = arithmeticFor(root);
  const residual = sigma !== null ? sigma - settlementNet : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arithmetic</CardTitle>
        <span className="text-[11px] text-faint">from recon lines</span>
      </CardHeader>
      <CardBody>
        {lines.length === 0 ? (
          <p className="text-[13px] text-muted">No settled lines in this batch.</p>
        ) : (
          <dl className="space-y-1.5">
            {lines.map((l) => (
              <div
                key={l.label}
                className={cn(
                  "flex items-baseline justify-between gap-3",
                  l.emphasis && "mt-2 border-t border-line-strong pt-2",
                )}
              >
                <dt className={cn("flex items-baseline gap-2 text-[13px]", l.emphasis ? "text-text font-medium" : "text-muted")}>
                  <span className="mono w-3 text-faint">{l.op}</span>
                  {l.label}
                </dt>
                <dd>
                  {l.op === "±" || l.op === "−" ? (
                    <Amount
                      paise={l.op === "−" ? -Math.abs(l.paise) : l.paise}
                      tone={l.op === "−" || l.paise < 0 ? "critical" : "settled"}
                      signed={l.op === "±"}
                      size={l.emphasis ? "md" : "sm"}
                    />
                  ) : (
                    <Amount paise={l.paise} size={l.emphasis ? "md" : "sm"} />
                  )}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <dt className="flex items-baseline gap-2 text-[13px] text-muted">
                <span className="mono w-3 text-faint" />
                Settlement says
              </dt>
              <dd>
                <Amount paise={settlementNet} size="sm" />
              </dd>
            </div>
            {bankAmount !== null && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="flex items-baseline gap-2 text-[13px] text-muted">
                  <span className="mono w-3 text-faint" />
                  Bank received
                </dt>
                <dd>
                  <Amount paise={bankAmount} size="sm" tone="settled" />
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex items-baseline gap-2 text-[13px] text-muted">
                <span className="mono w-3 text-faint" />
                Residual
              </dt>
              <dd>
                <Delta paise={residual} />
              </dd>
            </div>
          </dl>
        )}
      </CardBody>
    </Card>
  );
}
