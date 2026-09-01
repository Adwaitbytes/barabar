/**
 * Money is integer paise end to end, exactly as the backend holds it.
 * Formatting uses Indian digit grouping (lakh / crore) and never rounds.
 */

export type Paise = number;

function groupIndian(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

export interface InrParts {
  sign: "" | "-" | "+";
  rupees: string;
  paise: string;
}

export function splitInr(paise: Paise, opts?: { explicitPlus?: boolean }): InrParts {
  const negative = paise < 0;
  const abs = Math.abs(Math.trunc(paise));
  const rupees = Math.floor(abs / 100);
  const remainder = abs % 100;
  return {
    sign: negative ? "-" : opts?.explicitPlus && paise > 0 ? "+" : "",
    rupees: groupIndian(String(rupees)),
    paise: String(remainder).padStart(2, "0"),
  };
}

export function formatInr(
  paise: Paise,
  opts?: { symbol?: boolean; explicitPlus?: boolean; compact?: boolean },
): string {
  if (opts?.compact) return formatInrCompact(paise);
  const p = splitInr(paise, { explicitPlus: opts?.explicitPlus });
  const sym = opts?.symbol === false ? "" : "₹";
  return `${p.sign}${sym}${p.rupees}.${p.paise}`;
}

/** ₹1.08 Cr, ₹10.85 L, ₹8,159 — for chart axes and dense labels only. */
export function formatInrCompact(paise: Paise): string {
  const abs = Math.abs(paise) / 100;
  const sign = paise < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}₹${groupIndian(String(Math.round(abs)))}`;
  return `${sign}₹${abs.toFixed(2)}`;
}

export function pct(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}
