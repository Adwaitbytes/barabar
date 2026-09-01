import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function HeaderSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <div className="flex items-end justify-between pb-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className={cn("mb-5 grid gap-px overflow-hidden rounded-lg bg-line hairline", `grid-cols-2 sm:grid-cols-${cols}`)}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="space-y-2 bg-surface px-4 py-3">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 10, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg bg-surface hairline">
      <div className="flex gap-3 border-b border-line px-3 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="cascade flex items-center gap-3 border-b border-line px-3 py-3 last:border-0"
          style={{ "--i": r } as React.CSSProperties}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-3.5 flex-1", c === 0 && "max-w-24", c === cols - 1 && "max-w-20")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className, lines = 5 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-3 rounded-lg bg-surface p-5 hairline", className)}>
      <Skeleton className="h-3 w-40" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${60 + ((i * 17) % 35)}%` }} />
      ))}
    </div>
  );
}
