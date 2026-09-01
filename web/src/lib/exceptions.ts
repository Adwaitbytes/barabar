import type { ExceptionType } from "./types";

export type ExceptionFamily = "timing" | "pricing" | "refund" | "dispute" | "bank" | "ledger" | "razorpay";

export interface ExceptionSpec {
  family: ExceptionFamily;
  title: string;
  meaning: string;
  action: string;
  auto: boolean;
}

/** Rendered from docs/EXCEPTIONS.md. Titles are what a controller says out loud. */
export const EXCEPTION_SPECS: Record<ExceptionType, ExceptionSpec> = {
  TIMING_NOT_YET_SETTLED: {
    family: "timing",
    title: "Not yet settled",
    meaning: "Payment captured, settlement not yet due (T+2 working days not elapsed).",
    action: "Wait; show expected settlement date.",
    auto: false,
  },
  TIMING_BANK_LAG: {
    family: "timing",
    title: "Bank lag",
    meaning: "Settlement processed by Razorpay, bank credit not yet visible (≤ 1 working day).",
    action: "Wait; re-check next statement.",
    auto: false,
  },
  TIMING_HOLIDAY_SHIFT: {
    family: "timing",
    title: "Holiday shift",
    meaning: "Expected date fell on a weekend or RBI holiday; landed the next working day.",
    action: "Auto-resolved with note.",
    auto: true,
  },
  FEE_VARIANCE: {
    family: "pricing",
    title: "Fee variance",
    meaning: "Fee differs from rate card × amount beyond rounding.",
    action: "Verify rate card; raise with Razorpay if persistent.",
    auto: false,
  },
  TAX_VARIANCE: {
    family: "pricing",
    title: "Tax variance",
    meaning: "Tax differs from 18% × fee beyond rounding.",
    action: "Verify GST invoice.",
    auto: false,
  },
  ROUNDING: {
    family: "pricing",
    title: "Rounding",
    meaning: "Sub-rupee residual after netting.",
    action: "Accept as rounding; post to rounding ledger.",
    auto: true,
  },
  REFUND_NETTED: {
    family: "refund",
    title: "Refund netted",
    meaning: "A refund reduced this batch; ledger still shows the sale as fully paid.",
    action: "Post credit note / journal.",
    auto: false,
  },
  REFUND_PENDING_NET: {
    family: "refund",
    title: "Refund pending",
    meaning: "Refund processed but not yet netted in any batch.",
    action: "Wait; expect debit in next batch.",
    auto: false,
  },
  DISPUTE_DEBIT: {
    family: "dispute",
    title: "Chargeback debited",
    meaning: "Chargeback debited inside a batch.",
    action: "Surface dispute with evidence; hand off.",
    auto: false,
  },
  DISPUTE_REVERSAL: {
    family: "dispute",
    title: "Dispute reversal",
    meaning: "Dispute won; amount re-credited.",
    action: "Post reversal.",
    auto: false,
  },
  ADJUSTMENT: {
    family: "razorpay",
    title: "Manual adjustment",
    meaning: "Razorpay manual adjustment.",
    action: "Verify with Razorpay support note.",
    auto: false,
  },
  ON_HOLD: {
    family: "razorpay",
    title: "On hold",
    meaning: "Line marked on_hold by Razorpay.",
    action: "Explain; expect a later batch.",
    auto: false,
  },
  PARTIAL_SETTLEMENT: {
    family: "razorpay",
    title: "Partial settlement",
    meaning: "Batch settled less than settleable due to balance constraints.",
    action: "Link to continuation batch.",
    auto: false,
  },
  INSTANT_SETTLEMENT_FEE: {
    family: "pricing",
    title: "Instant settlement fee",
    meaning: "Extra fee line for instant settlement.",
    action: "Post to bank charges.",
    auto: false,
  },
  MULTI_UTR_SPLIT: {
    family: "bank",
    title: "Split across UTRs",
    meaning: "One settlement arrived as two or more bank credits.",
    action: "Link both; note.",
    auto: true,
  },
  MISSING_BANK_CREDIT: {
    family: "bank",
    title: "Missing bank credit",
    meaning: "Settlement processed beyond the lag window, no bank credit found.",
    action: "Raise with bank / Razorpay; draft ticket.",
    auto: false,
  },
  UNKNOWN_BANK_CREDIT: {
    family: "bank",
    title: "Unknown bank credit",
    meaning: "Bank credit with Razorpay-like narration and no matching settlement.",
    action: "Investigate (tier D).",
    auto: false,
  },
  DUPLICATE_BANK_CREDIT: {
    family: "bank",
    title: "Duplicate bank credit",
    meaning: "Same UTR credited twice.",
    action: "Flag for bank reversal.",
    auto: false,
  },
  NARRATION_TRUNCATED_UTR: {
    family: "bank",
    title: "Truncated UTR",
    meaning: "UTR cut by bank export; matched by prefix + amount + date.",
    action: "Accept with confidence; note.",
    auto: false,
  },
  SETTLEMENT_FAILED_RETURNED: {
    family: "bank",
    title: "Settlement returned",
    meaning: "Bank rejected the settlement; re-credited later.",
    action: "Link retry; note.",
    auto: false,
  },
  ORPHAN_LEDGER_ENTRY: {
    family: "ledger",
    title: "Orphan ledger entry",
    meaning: "Ledger invoice with no Razorpay payment (COD? other gateway? manual?).",
    action: "Ask user; tag channel.",
    auto: false,
  },
  AMOUNT_MISMATCH_LEDGER: {
    family: "ledger",
    title: "Ledger amount mismatch",
    meaning: "Payment and invoice differ (discount, shipping, partial).",
    action: "Suggest partial-payment entry.",
    auto: false,
  },
  DUPLICATE_LEDGER_ENTRY: {
    family: "ledger",
    title: "Duplicate ledger entry",
    meaning: "Same invoice twice.",
    action: "Merge.",
    auto: false,
  },
  INTL_FX: {
    family: "razorpay",
    title: "International FX",
    meaning: "International payment settled in INR with FX and markup.",
    action: "Explain FX line.",
    auto: false,
  },
  MARKETPLACE_TDS_TCS: {
    family: "razorpay",
    title: "Marketplace TDS / TCS",
    meaning: "Marketplace settlement with 0.1% 194-O TDS and 0.5% GST TCS lines.",
    action: "Post TDS receivable / TCS credit.",
    auto: false,
  },
};

export const FAMILY_LABEL: Record<ExceptionFamily, string> = {
  timing: "Timing",
  pricing: "Fees & tax",
  refund: "Refunds",
  dispute: "Disputes",
  bank: "Bank",
  ledger: "Ledger",
  razorpay: "Razorpay",
};

export function specFor(type: ExceptionType): ExceptionSpec {
  return EXCEPTION_SPECS[type];
}
