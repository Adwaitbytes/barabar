import type { MatchLink, RzReconLine, RzSettlement } from "@/lib/types";
import { formatInr } from "@/lib/money";

/** Mirrors src/barabar/exports/journal.py: one balanced voucher per processed settlement. */

export type GstSplit = "igst" | "cgst_sgst";

export const ACCOUNTS = {
  bank: "HDFC Bank",
  receivable: "Razorpay Receivable",
  pg_charges: "Payment Gateway Charges",
  igst_input: "Input IGST on PG Charges",
  cgst_input: "Input CGST on PG Charges",
  sgst_input: "Input SGST on PG Charges",
  sales_returns: "Sales Returns",
  chargeback_loss: "Chargeback Losses",
  chargeback_recovery: "Chargeback Recoveries",
  adjustments: "Razorpay Adjustments",
  rounding: "Rounding Off",
} as const;

export interface VoucherLine {
  ledger: string;
  debit: number;
  credit: number;
}

export interface Voucher {
  voucher_no: string;
  date: string;
  narration: string;
  lines: VoucherLine[];
  settlement_id: string;
  matched: boolean;
  balanced: boolean;
  totals: { debit: number; credit: number };
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDate(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function vouchersForRun(
  settlements: RzSettlement[],
  reconLines: RzReconLine[],
  links: MatchLink[],
  gstSplit: GstSplit,
): Voucher[] {
  const matched = new Set(
    links
      .filter((l) => l.from_entity.startsWith("bank:") && l.to_entity.startsWith("settlement:"))
      .map((l) => l.to_entity.split(":")[1]),
  );
  const bySetl = new Map<string, RzReconLine[]>();
  for (const ln of reconLines) {
    if (ln.settlement_id && ln.settled && !ln.on_hold) {
      bySetl.set(ln.settlement_id, [...(bySetl.get(ln.settlement_id) ?? []), ln]);
    }
  }
  const processed = settlements
    .filter((s) => s.status === "processed")
    .sort((a, b) => {
      const ka = `${a.settled_at ?? a.created_at}|${a.settlement_id}`;
      const kb = `${b.settled_at ?? b.created_at}|${b.settlement_id}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });

  return processed.map((s, i) => {
    const lines = bySetl.get(s.settlement_id) ?? [];
    const pay = lines.filter((l) => l.type === "payment");
    const gross = pay.reduce((a, l) => a + l.amount, 0);
    const fee = pay.reduce((a, l) => a + l.fee, 0);
    const tax = pay.reduce((a, l) => a + l.tax, 0);
    const refunds = lines.filter((l) => l.type === "refund").reduce((a, l) => a + l.debit, 0);
    const cbDebit = lines.filter((l) => l.dispute_id).reduce((a, l) => a + l.debit, 0);
    const cbCredit = lines.filter((l) => l.dispute_id).reduce((a, l) => a + l.credit, 0);
    const adjDebit = lines.filter((l) => l.type === "adjustment" && !l.dispute_id).reduce((a, l) => a + l.debit, 0);
    const adjCredit = lines.filter((l) => l.type === "adjustment" && !l.dispute_id).reduce((a, l) => a + l.credit, 0);
    const net = gross - fee - tax - refunds - cbDebit + cbCredit + adjCredit - adjDebit;
    const rounding = s.amount - net;

    const entries: VoucherLine[] = [{ ledger: ACCOUNTS.bank, debit: s.amount, credit: 0 }];
    if (fee) entries.push({ ledger: ACCOUNTS.pg_charges, debit: fee, credit: 0 });
    if (tax) {
      if (gstSplit === "igst") entries.push({ ledger: ACCOUNTS.igst_input, debit: tax, credit: 0 });
      else {
        const half = Math.floor(tax / 2);
        entries.push({ ledger: ACCOUNTS.cgst_input, debit: half, credit: 0 });
        entries.push({ ledger: ACCOUNTS.sgst_input, debit: tax - half, credit: 0 });
      }
    }
    if (refunds) entries.push({ ledger: ACCOUNTS.sales_returns, debit: refunds, credit: 0 });
    if (cbDebit) entries.push({ ledger: ACCOUNTS.chargeback_loss, debit: cbDebit, credit: 0 });
    if (adjDebit) entries.push({ ledger: ACCOUNTS.adjustments, debit: adjDebit, credit: 0 });
    if (gross) entries.push({ ledger: ACCOUNTS.receivable, debit: 0, credit: gross });
    if (cbCredit) entries.push({ ledger: ACCOUNTS.chargeback_recovery, debit: 0, credit: cbCredit });
    if (adjCredit) entries.push({ ledger: ACCOUNTS.adjustments, debit: 0, credit: adjCredit });
    if (rounding > 0) entries.push({ ledger: ACCOUNTS.rounding, debit: 0, credit: rounding });
    else if (rounding < 0) entries.push({ ledger: ACCOUNTS.rounding, debit: -rounding, credit: 0 });

    const when = istDate(s.settled_at ?? s.created_at);
    const isMatched = matched.has(s.settlement_id);
    const totals = {
      debit: entries.reduce((a, l) => a + l.debit, 0),
      credit: entries.reduce((a, l) => a + l.credit, 0),
    };
    return {
      voucher_no: `RZP/${when.slice(0, 4)}${when.slice(5, 7)}/${String(i + 1).padStart(4, "0")}`,
      date: when,
      narration:
        `Razorpay settlement ${s.settlement_id} UTR ${s.utr ?? "n/a"}: ${pay.length} payments gross ${formatInr(gross)}, ` +
        `PG fee ${formatInr(fee)}, GST ${formatInr(tax)}, refunds ${formatInr(refunds)}, chargebacks ${formatInr(cbDebit)}; ` +
        `net ${formatInr(s.amount)} (${isMatched ? "bank credit matched" : "bank credit NOT matched — review before posting"})`,
      lines: entries,
      settlement_id: s.settlement_id,
      matched: isMatched,
      balanced: totals.debit === totals.credit,
      totals,
    };
  });
}
