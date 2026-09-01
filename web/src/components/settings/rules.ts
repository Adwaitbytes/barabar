/**
 * Mirrors src/barabar/core/config.py (MatchConfig defaults), core/ratecard.py and
 * core/rbi_holidays.py. Read-only in v1: the backend owns these values and every
 * one of them is part of config_hash.
 */

export type KnobUnit = "paise" | "ratio" | "working_days" | "days" | "count" | "chars" | "score";

export interface Knob {
  key: string;
  label: string;
  value: number;
  unit: KnobUnit;
  meaning: string;
}

export interface KnobGroup {
  title: string;
  blurb: string;
  knobs: Knob[];
}

export const KNOB_GROUPS: KnobGroup[] = [
  {
    title: "Matching tolerances",
    blurb: "How far two amounts may differ and still be the same money.",
    knobs: [
      {
        key: "tolerance_paise",
        label: "Batch net vs bank credit",
        value: 0,
        unit: "paise",
        meaning: "B1: a settlement's net must equal the bank credit to this many paise. Default exact.",
      },
      {
        key: "rounding_line_paise",
        label: "Per-line rounding",
        value: 1,
        unit: "paise",
        meaning: "Fee or tax that differs from the rate card by at most this is rounding, not a variance.",
      },
      {
        key: "rounding_batch_paise",
        label: "Per-batch rounding",
        value: 100,
        unit: "paise",
        meaning: "Sub-rupee residual after netting a whole batch is posted to the rounding ledger.",
      },
      {
        key: "max_split_credits",
        label: "Max credits per settlement",
        value: 4,
        unit: "count",
        meaning: "Bounded subset-sum: one settlement may arrive as up to this many bank credits.",
      },
    ],
  },
  {
    title: "Confidence",
    blurb: "Where a link becomes a proposal a person has to accept.",
    knobs: [
      {
        key: "auto_accept_threshold",
        label: "Auto-accept threshold",
        value: 0.92,
        unit: "ratio",
        meaning: "Links at or above this confidence are accepted by rule; below it they surface as exceptions with a candidate.",
      },
      {
        key: "tier_c_cap",
        label: "Tier C cap",
        value: 0.85,
        unit: "ratio",
        meaning: "A fuzzy bank match can never score above this, so it can never auto-accept.",
      },
      {
        key: "tier_c_ledger_cap",
        label: "Tier C ledger cap",
        value: 0.8,
        unit: "ratio",
        meaning: "Same ceiling for fuzzy ledger matches, one notch lower.",
      },
      {
        key: "prefix_min_len",
        label: "Truncated-UTR prefix",
        value: 10,
        unit: "chars",
        meaning: "A bank export that cuts the UTR still matches when at least this many leading characters agree.",
      },
      {
        key: "razorpay_similarity_min",
        label: "Narration similarity",
        value: 80,
        unit: "score",
        meaning: "rapidfuzz score a narration needs before it is treated as Razorpay-like.",
      },
    ],
  },
  {
    title: "Calendar windows",
    blurb: "IST day boundaries, T+2 working days, RBI holidays.",
    knobs: [
      {
        key: "bank_lag_working_days",
        label: "Bank lag",
        value: 1,
        unit: "working_days",
        meaning: "Razorpay says processed, the bank has not shown it yet. Inside this window it is TIMING_BANK_LAG; beyond it, MISSING_BANK_CREDIT.",
      },
      {
        key: "date_window_working_days",
        label: "Date window",
        value: 3,
        unit: "working_days",
        meaning: "How far from the expected value date a bank credit may land and still be considered.",
      },
    ],
  },
  {
    title: "Ledger",
    blurb: "Matching payments to the sales ledger by receipt, amount and date.",
    knobs: [
      {
        key: "ledger_tolerance_paise",
        label: "Ledger amount tolerance",
        value: 100,
        unit: "paise",
        meaning: "Invoice and payment may differ by this much before it is AMOUNT_MISMATCH_LEDGER.",
      },
      {
        key: "ledger_date_window_days",
        label: "Ledger date window",
        value: 3,
        unit: "days",
        meaning: "Calendar days between invoice date and capture that still count as the same sale.",
      },
    ],
  },
];

export const ROUNDING_POLICY = "ROUND_HALF_UP";

export interface RateRow {
  key: string;
  label: string;
  bps: number;
  note: string;
}

/** Razorpay public pricing, Sept 2026: 2% + GST standard; UPI and RuPay debit are zero-MDR by regulation; international cards 3%. */
export const RATE_CARD: RateRow[] = [
  { key: "card", label: "Cards (domestic)", bps: 200, note: "Visa, Mastercard, RuPay credit" },
  { key: "rupay_debit", label: "RuPay debit", bps: 0, note: "Zero MDR by regulation" },
  { key: "intl_card", label: "International cards", bps: 300, note: "Settled in INR" },
  { key: "upi", label: "UPI", bps: 0, note: "Zero MDR by regulation" },
  { key: "netbanking", label: "Netbanking", bps: 200, note: "" },
  { key: "wallet", label: "Wallets", bps: 200, note: "" },
  { key: "emi", label: "EMI", bps: 200, note: "" },
  { key: "paylater", label: "Pay Later", bps: 200, note: "" },
  { key: "bank_transfer", label: "Bank transfer", bps: 200, note: "Smart Collect" },
];

export const GST_ON_FEE_BPS = 1800;

export interface Holiday {
  date: string;
  name: string;
  scope: "nationwide" | "state";
}

/** RBI holiday matrix 2026 under the Negotiable Instruments Act, 1881. State entries are opt-in. */
export const RBI_HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-15", name: "Makara Sankranti / Pongal / Uttarayana Punyakala", scope: "state" },
  { date: "2026-01-26", name: "Republic Day", scope: "nationwide" },
  { date: "2026-02-19", name: "Chhatrapati Shivaji Maharaj Jayanti", scope: "state" },
  { date: "2026-03-03", name: "Holi (second day)", scope: "nationwide" },
  { date: "2026-03-19", name: "Gudhi Padwa / Ugadi / Telugu New Year / 1st Navratra", scope: "state" },
  { date: "2026-03-21", name: "Ramzan-Id (Id-ul-Fitr)", scope: "nationwide" },
  { date: "2026-03-26", name: "Shree Ram Navami", scope: "nationwide" },
  { date: "2026-03-31", name: "Mahavir Jayanti", scope: "nationwide" },
  { date: "2026-04-01", name: "Bank year-end account closure", scope: "nationwide" },
  { date: "2026-04-03", name: "Good Friday", scope: "nationwide" },
  { date: "2026-04-14", name: "Dr. Ambedkar Jayanti / Baisakhi / Tamil New Year / Bohag Bihu", scope: "state" },
  { date: "2026-05-01", name: "Maharashtra Day / May Day", scope: "state" },
  { date: "2026-05-28", name: "Bakri Id", scope: "nationwide" },
  { date: "2026-06-26", name: "Muharram", scope: "nationwide" },
  { date: "2026-08-15", name: "Independence Day", scope: "nationwide" },
  { date: "2026-08-26", name: "Id-e-Milad", scope: "nationwide" },
  { date: "2026-09-14", name: "Ganesh Chaturthi", scope: "state" },
  { date: "2026-10-02", name: "Mahatma Gandhi Jayanti", scope: "nationwide" },
  { date: "2026-10-20", name: "Dussehra", scope: "nationwide" },
  { date: "2026-11-10", name: "Diwali", scope: "nationwide" },
  { date: "2026-11-24", name: "Guru Nanak Jayanti", scope: "nationwide" },
  { date: "2026-12-25", name: "Christmas", scope: "nationwide" },
];

export const CALENDAR_DEFAULTS = {
  weekend_policy: "all_weekends",
  cycle_working_days: 2,
  cutoff_ist: "23:59:59",
  include_state_holidays: false,
} as const;
