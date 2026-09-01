import type { AskResult, ClosePackSettlement, ExceptionItem } from "@/lib/types";
import { formatInr } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { specFor } from "@/lib/exceptions";

/** The slice of a run a question can be answered from without a model. */
export interface AskContext {
  runName: string;
  asOf: string;
  settlements: ClosePackSettlement[];
  openExceptions: Pick<ExceptionItem, "exc_id" | "type" | "amount" | "reason_text" | "entities" | "confidence">[];
  facts: {
    gross_captured: number;
    explained: number;
    unexplained: number;
    rupees_explained_pct: number;
    settlements_processed: number;
    settlements_matched: number;
    pg_fees: number;
    gst_on_fees_itc: number;
    refunds_netted: number;
    chargebacks_debited: number;
  };
}

export interface Suggestion {
  key: string;
  question: string;
  answer: (ctx: AskContext) => AskResult;
}

function largestSettlement(ctx: AskContext): ClosePackSettlement | undefined {
  return [...ctx.settlements].sort((a, b) => b.amount - a.amount)[0];
}

function largestOpen(ctx: AskContext) {
  return [...ctx.openExceptions].sort((a, b) => b.amount - a.amount)[0];
}

export const SUGGESTIONS: Suggestion[] = [
  {
    key: "largest-settlement",
    question: (() => "Why did the largest settlement land in my bank?")(),
    answer: (ctx) => {
      const s = largestSettlement(ctx);
      if (!s) return { answer: "This run has no settlements.", citations: [], settlement_ids: [], guard: { numbers_checked: 0, blocked: false } };
      const net = s.gross - s.fee - s.tax;
      return {
        answer:
          `${formatInr(s.amount)} landed on ${fmtDate(s.settled_on)} as settlement ${s.settlement_id} ` +
          `(UTR ${s.utr ?? "n/a"}, ${s.mode}). It carries ${s.lines} lines: gross ${formatInr(s.gross)} ` +
          `minus PG fee ${formatInr(s.fee)} minus GST ${formatInr(s.tax)} = ${formatInr(net)}; ` +
          `refunds, disputes and adjustments inside the batch account for the remaining ${formatInr(net - s.amount)}. ` +
          `Bank match status: ${s.match_status}. Open the proof tree for the line-level decomposition.`,
        citations: [{ ref: `settlement:${s.settlement_id}`, summary: `Settlement net ${formatInr(s.amount)}` }],
        settlement_ids: [s.settlement_id],
        guard: { numbers_checked: 6, blocked: false },
      };
    },
  },
  {
    key: "largest-open",
    question: "What is the largest open exception and what should I do?",
    answer: (ctx) => {
      const e = largestOpen(ctx);
      if (!e) return { answer: "There are no open exceptions in this run.", citations: [], settlement_ids: [], guard: { numbers_checked: 0, blocked: false } };
      const spec = specFor(e.type);
      return {
        answer:
          `${e.exc_id} is a ${spec.title} (${e.type}) for ${formatInr(e.amount)} at ${Math.round(e.confidence * 100)}% confidence. ` +
          `Reason: ${e.reason_text}. Suggested action: ${spec.action}`,
        citations: [
          { ref: `exception ${e.exc_id}`, summary: `${e.type} · ${formatInr(e.amount)}` },
          ...e.entities.slice(0, 3).map((r) => ({ ref: r, summary: "entity in the exception" })),
        ],
        settlement_ids: e.entities.filter((r) => r.startsWith("settlement:")).map((r) => r.split(":")[1]),
        guard: { numbers_checked: 2, blocked: false },
      };
    },
  },
  {
    key: "refunds",
    question: "How much was netted for refunds this month?",
    answer: (ctx) => ({
      answer:
        `Refunds netted inside settlement batches total ${formatInr(ctx.facts.refunds_netted)} for the month ending ${ctx.asOf}. ` +
        `Chargebacks debited add ${formatInr(ctx.facts.chargebacks_debited)}. Each refund line appears under its batch in the proof tree with rule B3-REFUND-NET.`,
      citations: [{ ref: "metrics.refunds_netted", summary: formatInr(ctx.facts.refunds_netted) }],
      settlement_ids: [],
      guard: { numbers_checked: 2, blocked: false },
    }),
  },
  {
    key: "gst",
    question: "What GST input credit can I claim on Razorpay fees?",
    answer: (ctx) => ({
      answer:
        `PG fees for the period total ${formatInr(ctx.facts.pg_fees)}; GST on those fees is ${formatInr(ctx.facts.gst_on_fees_itc)}, ` +
        `claimable as input tax credit against Razorpay's monthly tax invoice (GSTR-3B table 4A(5)). The journal posts it to Input IGST on PG Charges, or split CGST/SGST if you toggle it.`,
      citations: [
        { ref: "metrics.pg_fees", summary: formatInr(ctx.facts.pg_fees) },
        { ref: "metrics.gst_on_fees_itc", summary: formatInr(ctx.facts.gst_on_fees_itc) },
      ],
      settlement_ids: [],
      guard: { numbers_checked: 2, blocked: false },
    }),
  },
  {
    key: "missing",
    question: "Which settlement has no bank credit yet?",
    answer: (ctx) => {
      const missing = ctx.settlements.filter((s) => s.match_status === "missing" || s.match_status === "pending");
      if (!missing.length)
        return {
          answer: `Every processed settlement (${ctx.facts.settlements_matched} of ${ctx.facts.settlements_processed}) has a bank credit.`,
          citations: [],
          settlement_ids: [],
          guard: { numbers_checked: 2, blocked: false },
        };
      return {
        answer:
          `${missing.length} settlement${missing.length > 1 ? "s" : ""} without a bank credit: ` +
          missing
            .map(
              (s) =>
                `${s.settlement_id} for ${formatInr(s.amount)} processed ${fmtDate(s.settled_on)} (${s.match_status === "pending" ? "still inside the bank lag window" : "past the lag window, raise with the bank"})`,
            )
            .join("; ") +
          `. ${ctx.facts.settlements_matched} of ${ctx.facts.settlements_processed} processed settlements are matched.`,
        citations: missing.map((s) => ({ ref: `settlement:${s.settlement_id}`, summary: `${s.match_status} · ${formatInr(s.amount)}` })),
        settlement_ids: missing.map((s) => s.settlement_id),
        guard: { numbers_checked: missing.length + 2, blocked: false },
      };
    },
  },
];

export function suggestionFor(question: string): Suggestion | undefined {
  const q = question.trim().toLowerCase();
  return SUGGESTIONS.find((s) => s.question.toLowerCase() === q);
}
