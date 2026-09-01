import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "settled" | "open" | "critical";
}

/** A row of headline figures above a table. Numbers, not dials. */
export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn(
        "mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line hairline sm:grid-cols-4",
        className,
      )}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{ "--i": i } as React.CSSProperties}
          className="cascade bg-surface px-4 py-3 transition-colors hover:bg-raised/60"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{s.label}</div>
          <div
            className={cn(
              "mt-1 text-[17px] font-medium leading-tight",
              s.tone === "settled" && "text-settled-fg",
              s.tone === "open" && "text-open-fg",
              s.tone === "critical" && "text-critical-fg",
            )}
          >
            {s.value}
          </div>
          {s.hint && <div className="mt-0.5 text-[12px] text-muted">{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}
