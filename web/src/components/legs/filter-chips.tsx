import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Chip {
  value: string;
  label: string;
  count?: number;
}

/**
 * Filter chips that live in the URL. Server-rendered links, so the back button,
 * sharing and refresh all keep the filter.
 */
export function FilterChips({
  basePath,
  param,
  current,
  chips,
  keep = {},
  className,
}: {
  basePath: string;
  param: string;
  current: string;
  chips: Chip[];
  /** Other search params to preserve. */
  keep?: Record<string, string | undefined>;
  className?: string;
}) {
  const href = (value: string) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) qs.set(k, v);
    if (value && value !== "all") qs.set(param, value);
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label="Filter">
      {chips.map((c) => {
        const active = current === c.value || (!current && c.value === "all");
        return (
          <Link
            key={c.value}
            href={href(c.value)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] transition-colors",
              active
                ? "bg-text text-bg dark:bg-white dark:text-black"
                : "bg-surface text-muted hairline hover:bg-raised hover:text-text",
            )}
          >
            {c.label}
            {typeof c.count === "number" && (
              <span className={cn("mono text-[11px]", active ? "opacity-70" : "text-faint")}>{c.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
