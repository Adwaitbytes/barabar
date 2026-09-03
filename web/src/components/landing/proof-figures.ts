import { formatInr } from "@/lib/money";

/**
 * The hero's worked example. Everything derives from four primitives so the
 * arithmetic is exact to the paise by construction: net = gross − fee − GST − refunds.
 */
const GROSS = 18_900_000; // ₹1,89,000.00 across 66 captured payments
const FEE = 309_661; // ₹3,096.61 payment-gateway fee
const TAX = Math.round(FEE * 0.18); // ₹557.39 GST on the fee
const REFUNDS = [
  { id: "rfnd_8X1Duo9QfnwNMt", amount: 149_900 },
  { id: "rfnd_Levrbm6idTSGkp", amount: 43_500 },
] as const;

const REFUND_TOTAL = REFUNDS.reduce((s, r) => s + r.amount, 0);
const PAYMENTS_NET = GROSS - FEE - TAX;
const NET = PAYMENTS_NET - REFUND_TOTAL;

export const proofFigures = {
  gross: GROSS,
  fee: FEE,
  tax: TAX,
  refunds: REFUNDS,
  refundTotal: REFUND_TOTAL,
  paymentsNet: PAYMENTS_NET,
  net: NET,
  paymentCount: 66,
  bank: "HDFC",
  utr: "HDFCN26217000102",
  settlementId: "setl_2Jj4aF8gMQjDGO",
  settledOn: "05 Aug 2026",
  mode: "NEFT",
} as const;

/** "₹1,83,412.00": the number in the headline and the last line of the tree. */
export const HEADLINE_AMOUNT = formatInr(NET);

export type RuleId = "A1-UTR-EXACT" | "B1-BATCH-NET" | "B2-GROSS-FEE-TAX-DECOMP" | "B3-REFUND-NET";

export interface ProofLine {
  /** Tree glyphs + label, typed character by character. */
  text: string;
  /** Right-aligned figure, revealed with the line. */
  amount?: string;
  rule?: RuleId;
  /** Final Σ line gets the check mark instead of a rule. */
  sigma?: boolean;
  depth: 0 | 1 | 2;
}

export const proofLines: ProofLine[] = [
  {
    depth: 0,
    text: `bank credit  ${proofFigures.bank} · ${proofFigures.settledOn.slice(0, 6)} · ${proofFigures.mode}`,
    amount: formatInr(NET),
    rule: "A1-UTR-EXACT",
  },
  { depth: 1, text: `↳ UTR ${proofFigures.utr} = ${proofFigures.settlementId}` },
  {
    depth: 0,
    text: `settlement   ${proofFigures.settlementId}`,
    amount: formatInr(NET),
    rule: "B1-BATCH-NET",
  },
  {
    depth: 1,
    text: `├ ${proofFigures.paymentCount} payments  gross`,
    amount: formatInr(GROSS),
    rule: "B2-GROSS-FEE-TAX-DECOMP",
  },
  { depth: 2, text: "│   − PG fee", amount: `−${formatInr(FEE)}` },
  { depth: 2, text: "│   − GST 18% on fee", amount: `−${formatInr(TAX)}` },
  {
    depth: 1,
    text: `├ ${REFUNDS.length} refunds netted`,
    amount: `−${formatInr(REFUND_TOTAL)}`,
    rule: "B3-REFUND-NET",
  },
  ...REFUNDS.map<ProofLine>((r) => ({
    depth: 2,
    text: `│   ${r.id}`,
    amount: `−${formatInr(r.amount)}`,
  })),
  {
    depth: 0,
    text: `Σ = ${formatInr(NET)} · residual ${formatInr(0)}`,
    sigma: true,
  },
];
