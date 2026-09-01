/**
 * Mirrors src/barabar/core/models.py, core/result.py and the FastAPI payloads in
 * src/barabar/api/app.py. Amounts are integer paise. Dates are ISO strings.
 */

export type Paise = number;

export type PaymentStatus = "created" | "authorized" | "captured" | "refunded" | "failed";
export type RefundStatus = "pending" | "processed" | "failed";
export type SettlementType = "standard" | "instant" | "partial";
export type SettlementStatus = "created" | "processed" | "failed";
export type TransferMode = "NEFT" | "RTGS" | "IMPS" | "UPI" | "OTHER";
export type ReconLineType = "payment" | "refund" | "transfer" | "adjustment";
export type Bank = "HDFC" | "ICICI" | "SBI" | "AXIS" | "KOTAK" | "RAZORPAYX" | "UNKNOWN";
export type LedgerStatus = "open" | "paid" | "partial" | "cancelled";
export type Tier = "A" | "B" | "C" | "D-accepted";
export type ExceptionStatus = "open" | "investigating" | "resolved" | "accepted" | "auto_resolved";
export type EntityKind =
  | "payment"
  | "refund"
  | "dispute"
  | "adjustment"
  | "settlement"
  | "recon_line"
  | "bank"
  | "ledger";

export const EXCEPTION_TYPES = [
  "TIMING_NOT_YET_SETTLED",
  "TIMING_BANK_LAG",
  "TIMING_HOLIDAY_SHIFT",
  "FEE_VARIANCE",
  "TAX_VARIANCE",
  "ROUNDING",
  "REFUND_NETTED",
  "REFUND_PENDING_NET",
  "DISPUTE_DEBIT",
  "DISPUTE_REVERSAL",
  "ADJUSTMENT",
  "ON_HOLD",
  "PARTIAL_SETTLEMENT",
  "INSTANT_SETTLEMENT_FEE",
  "MULTI_UTR_SPLIT",
  "MISSING_BANK_CREDIT",
  "UNKNOWN_BANK_CREDIT",
  "DUPLICATE_BANK_CREDIT",
  "NARRATION_TRUNCATED_UTR",
  "SETTLEMENT_FAILED_RETURNED",
  "ORPHAN_LEDGER_ENTRY",
  "AMOUNT_MISMATCH_LEDGER",
  "DUPLICATE_LEDGER_ENTRY",
  "INTL_FX",
  "MARKETPLACE_TDS_TCS",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export interface RzPayment {
  payment_id: string;
  order_id: string | null;
  order_receipt: string | null;
  amount: Paise;
  fee: Paise;
  tax: Paise;
  method: string;
  card_network: string | null;
  card_type: string | null;
  international: boolean;
  currency: string;
  captured_at: string | null;
  created_at: string;
  status: PaymentStatus;
  notes: Record<string, string>;
}

export interface RzRefund {
  refund_id: string;
  payment_id: string;
  amount: Paise;
  created_at: string;
  processed_at: string | null;
  status: RefundStatus;
  speed: "normal" | "optimum" | "instant";
}

export interface RzDispute {
  dispute_id: string;
  payment_id: string;
  amount: Paise;
  phase: "fraud" | "retrieval" | "chargeback" | "pre_arbitration" | "arbitration";
  status: "open" | "under_review" | "won" | "lost" | "closed";
  respond_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface RzAdjustment {
  adjustment_id: string;
  amount: Paise;
  reason: string;
  created_at: string;
  settlement_id: string | null;
}

export interface RzSettlement {
  settlement_id: string;
  amount: Paise;
  fees: Paise;
  tax: Paise;
  utr: string | null;
  status: SettlementStatus;
  type: SettlementType;
  mode: TransferMode;
  created_at: string;
  settled_at: string | null;
  continuation_of: string | null;
  retry_of: string | null;
}

export interface RzReconLine {
  entity_id: string;
  type: ReconLineType;
  settlement_id: string | null;
  debit: Paise;
  credit: Paise;
  amount: Paise;
  fee: Paise;
  tax: Paise;
  currency: string;
  on_hold: boolean;
  settled: boolean;
  created_at: string;
  settled_at: string | null;
  posted_at: string | null;
  settlement_utr: string | null;
  credit_type: string;
  description: string | null;
  notes: string | null;
  order_id: string | null;
  order_receipt: string | null;
  payment_id: string | null;
  dispute_id: string | null;
  method: string | null;
  card_network: string | null;
  card_type: string | null;
}

export interface NarrationParsed {
  mode: TransferMode;
  utr_full: string | null;
  utr_prefix: string | null;
  counterparty: string | null;
  remarks: string | null;
  settlement_id_hint: string | null;
  razorpay_like: boolean;
  parser: string;
}

export interface BankTxn {
  bank_txn_id: string;
  bank: Bank;
  value_date: string;
  posted_date: string;
  narration_raw: string;
  narration: NarrationParsed | null;
  credit: Paise;
  debit: Paise;
  balance_after: Paise | null;
  source_file: string;
  row_no: number;
}

export interface LedgerEntry {
  ledger_id: string;
  invoice_no: string;
  customer_ref: string | null;
  order_receipt: string | null;
  payment_ref: string | null;
  date: string;
  gross: Paise;
  gst_component: Paise | null;
  status: LedgerStatus;
  source: string;
  notes: string | null;
}

export interface MatchLink {
  link_id: string;
  run_id: string;
  from_entity: string;
  to_entity: string;
  tier: Tier;
  rule_id: string;
  confidence: number;
  amount_matched: Paise;
  residual: Paise;
  created_at: string;
}

export interface Evidence {
  kind: "tool_call" | "record" | "rule" | "note";
  ref: string;
  summary: string;
  result_hash: string | null;
}

export interface ExceptionItem {
  exc_id: string;
  run_id: string;
  type: ExceptionType;
  subtype: string | null;
  secondary_tags: ExceptionType[];
  amount: Paise;
  entities: string[];
  confidence: number;
  reason_code: string;
  reason_text: string;
  suggested_action: string;
  status: ExceptionStatus;
  evidence: Evidence[];
  candidate_link: MatchLink | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  /** API adds these on top of the model dump. */
  amount_display: string;
  spec: { meaning: string; auto_resolvable: boolean };
}

export type ProofKind =
  | "root"
  | "bank"
  | "settlement"
  | "group"
  | "line"
  | "payment"
  | "refund"
  | "dispute"
  | "adjustment"
  | "note";

export interface ProofNode {
  kind: ProofKind;
  label: string;
  entity: string | null;
  amount: Paise | null;
  rule_id: string | null;
  confidence: number | null;
  children: ProofNode[];
  meta: Record<string, string | number | boolean | null>;
}

export interface AuditEvent {
  event_id: string;
  run_id: string | null;
  actor: string;
  action: string;
  target: string;
  rule_or_evidence: string;
  ts: string;
  prev_hash: string;
  hash: string;
}

export interface AuditTrail {
  head: string;
  verified: boolean;
  events: AuditEvent[];
}

export interface RunMetrics {
  gross_captured_paise: number;
  payments: number;
  settlements: number;
  settlements_processed: number;
  settlements_matched_to_bank: number;
  bank_credits: number;
  ledger_entries: number;
  links_total: number;
  links_tier_A: number;
  links_tier_B: number;
  links_tier_C: number;
  "links_tier_D-accepted": number;
  exceptions_total: number;
  exceptions_open: number;
  exceptions_auto_resolved: number;
  unexplained_paise: number;
  explained_paise: number;
  rupees_explained_pct: number;
  ledger_open_paise: number;
  payments_with_ledger_match: number;
}

export type RunSource =
  | { kind: "synthetic"; seed: number; n_orders: number; profile: string }
  | { kind: "dataset"; path: string }
  | { kind: "upload"; files: string[] }
  | { kind: "rerun"; of: string };

export interface Run {
  run_id: string;
  name: string;
  as_of: string;
  stage: string;
  inputs_hash: string;
  config_hash: string;
  code_version: string;
  outputs_hash: string | null;
  started_at: string | null;
  finished_at: string | null;
  metrics: RunMetrics;
  source: RunSource;
}

export type SettlementMatchStatus =
  | "matched"
  | "partial"
  | "split"
  | "pending"
  | "missing"
  | "proposed"
  | "failed"
  | "duplicate"
  | "open"
  | "unmatched";

export interface ClosePackSettlement {
  settlement_id: string;
  amount: Paise;
  amount_display: string;
  utr: string | null;
  status: SettlementStatus;
  type: SettlementType;
  mode: TransferMode;
  settled_at: string | null;
  settled_on: string;
  lines: number;
  gross: Paise;
  fee: Paise;
  tax: Paise;
  match_status: SettlementMatchStatus;
}

export interface CalendarDay {
  date: string;
  expected: Paise;
  actual: Paise;
  delta: Paise;
}

export interface ClosePackHeadline {
  gross_captured: Paise;
  explained: Paise;
  unexplained: Paise;
  rupees_explained_pct: number;
  ledger_open: Paise;
  gross_captured_display: string;
  explained_display: string;
  unexplained_display: string;
}

export interface ClosePackFacts {
  as_of: string;
  gross_captured: Paise;
  explained: Paise;
  unexplained: Paise;
  rupees_explained_pct: number;
  settlements_processed: number;
  settlements_matched: number;
  pg_fees: Paise;
  gst_on_fees_itc: Paise;
  refunds_netted: Paise;
  chargebacks_debited: Paise;
  exceptions_total: number;
  exceptions_open: number;
  exceptions_auto_resolved: number;
  open_amount: Paise;
}

export interface ClosePack {
  run: Run;
  headline: ClosePackHeadline;
  metrics: RunMetrics;
  settlements: ClosePackSettlement[];
  calendar: CalendarDay[];
  exceptions_by_type: Partial<Record<ExceptionType, { count: number; amount: Paise }>>;
  exceptions_open: number;
  exceptions_total: number;
  facts: ClosePackFacts;
}

export interface RerunResult extends Run {
  identical_outputs: boolean;
  diff: { closed: ExceptionItem[]; opened: ExceptionItem[]; unchanged: number };
}

export interface Hypothesis {
  type_proposed: ExceptionType;
  confidence: number;
  evidence: Evidence[];
  suggested_action: string;
  draft_note: string;
  alternative_rejected: string;
}

export interface InvestigateResult {
  exc_id: string;
  hypothesis: Hypothesis;
  model: string;
  cached: boolean;
}

export interface AskResult {
  answer: string;
  citations: { ref: string; summary: string }[];
  settlement_ids: string[];
  guard: { numbers_checked: number; blocked: boolean };
}

export type MonthKind =
  | "payments"
  | "refunds"
  | "disputes"
  | "adjustments"
  | "settlements"
  | "recon_lines"
  | "bank_txns"
  | "ledger";

export interface MonthKindMap {
  payments: RzPayment;
  refunds: RzRefund;
  disputes: RzDispute;
  adjustments: RzAdjustment;
  settlements: RzSettlement;
  recon_lines: RzReconLine;
  bank_txns: BankTxn;
  ledger: LedgerEntry;
}

/** "settlement:setl_x" → { kind, id } */
export function parseRef(ref: string): { kind: EntityKind; id: string } {
  const i = ref.indexOf(":");
  return { kind: ref.slice(0, i) as EntityKind, id: ref.slice(i + 1) };
}
