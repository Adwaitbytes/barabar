import { cn } from "@/lib/utils";
import { formatInr, type Paise } from "@/lib/money";
import { Hint } from "@/components/ui/tooltip";

/**
 * The Reconciliation Band. One bar, three segments, every screen:
 * explained to the paise · open exceptions still to be decided · unexplained.
 * Widths are by rupees, not by count, because that is what a controller signs off on.
 */
export function Band({
  explained,
  open,
  unexplained,
  size = "sm",
  className,
  showLegend = false,
}: {
  explained: Paise;
  /** Amount held in open exceptions that are still confident (≥ threshold). */
  open: Paise;
  unexplained: Paise;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLegend?: boolean;
}) {
  const total = Math.max(explained + open + unexplained, 1);
  const w = (v: Paise) => `${Math.max((v / total) * 100, v > 0 ? 0.6 : 0)}%`;
  const h = { sm: "h-1.5", md: "h-2.5", lg: "h-4" }[size];

  const segs = [
    { key: "explained", label: "Explained", value: explained, color: "bg-settled" },
    { key: "open", label: "Open exceptions", value: open, color: "bg-open" },
    { key: "unexplained", label: "Unexplained", value: unexplained, color: "bg-critical" },
  ] as const;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={`Explained ${formatInr(explained)}, open ${formatInr(open)}, unexplained ${formatInr(unexplained)}`}
        className={cn("flex w-full overflow-hidden rounded-full bg-line", h)}
      >
        {segs.map((s) => (
          <Hint key={s.key} label={`${s.label} · ${formatInr(s.value)}`}>
            <div
              className={cn("h-full transition-[width] duration-700 ease-out-quart", s.color)}
              style={{ width: w(s.value) }}
            />
          </Hint>
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
          {segs.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", s.color)} />
              {s.label}
              <span className="mono text-text">{formatInr(s.value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
