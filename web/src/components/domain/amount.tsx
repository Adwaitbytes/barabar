import { cn } from "@/lib/utils";
import { splitInr, type Paise } from "@/lib/money";

type Tone = "default" | "settled" | "open" | "critical" | "muted";

const toneClass: Record<Tone, string> = {
  default: "text-text",
  settled: "text-settled-fg",
  open: "text-open-fg",
  critical: "text-critical-fg",
  muted: "text-muted",
};

/**
 * The product's typographic tell: rupees in full weight, paise dimmed but never
 * dropped. Integer paise in, exact figure out.
 */
export function Amount({
  paise,
  tone = "default",
  signed = false,
  size = "md",
  className,
}: {
  paise: Paise;
  tone?: Tone;
  /** Show a leading + for positive values. */
  signed?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "display";
  className?: string;
}) {
  const p = splitInr(paise, { explicitPlus: signed });
  const sizeClass = {
    sm: "text-[12.5px]",
    md: "text-[13.5px]",
    lg: "text-base",
    xl: "text-2xl tracking-[-0.01em]",
    display: "text-[44px] leading-none tracking-[-0.03em] font-medium",
  }[size];
  return (
    <span
      className={cn("mono whitespace-nowrap", sizeClass, toneClass[tone], className)}
      title={`${p.sign}₹${p.rupees}.${p.paise}`}
    >
      {p.sign}
      <span className="opacity-70">₹</span>
      {p.rupees}
      <span className="opacity-45">.{p.paise}</span>
    </span>
  );
}

/** Signed delta, coloured by direction; zero renders quietly. */
export function Delta({ paise, className }: { paise: Paise; className?: string }) {
  if (paise === 0) return <span className={cn("mono text-faint", className)}>0.00</span>;
  return (
    <Amount
      paise={paise}
      signed
      tone={paise > 0 ? "settled" : "critical"}
      className={className}
    />
  );
}
