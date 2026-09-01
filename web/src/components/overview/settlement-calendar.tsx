"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatInr, formatInrCompact } from "@/lib/money";
import { fmtDate, weekday } from "@/lib/format";
import type { CalendarDay } from "@/lib/types";
import { Amount, Delta } from "@/components/domain/amount";

/**
 * Expected bank credits (Razorpay says it settled) against what actually landed,
 * per value date. Two categorical series; a delta is a status and is labelled,
 * never colour alone.
 *
 * Series colours were validated with the dataviz palette script for both surfaces:
 *   light  expected #3f5fe0  landed #1f9d68
 *   dark   expected #6079e8  landed #26a670
 */

const W = 880;
const H = 240;
const PAD = { top: 18, right: 12, bottom: 34, left: 56 };
const BAR_MAX = 18;
const GAP = 2;

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.5; v += step) ticks.push(v);
  return ticks;
}

export function SettlementCalendar({ days }: { days: CalendarDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();

  const model = useMemo(() => {
    const max = Math.max(1, ...days.flatMap((d) => [d.expected, d.actual]));
    const ticks = niceTicks(max);
    const yMax = ticks[ticks.length - 1] || max;
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const band = plotW / Math.max(days.length, 1);
    const bar = Math.min(BAR_MAX, (band - GAP * 3) / 2);
    const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
    return { ticks, yMax, plotW, plotH, band, bar, y };
  }, [days]);

  const { ticks, plotH, band, bar, y } = model;
  const baseline = PAD.top + plotH;

  if (days.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-muted">
        No processed settlements in this run yet.
      </div>
    );
  }

  const hovered = hover === null ? null : days[hover];

  return (
    <figure className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted">
        <LegendKey className="bg-[#3f5fe0] dark:bg-[#6079e8]">Expected (Razorpay processed)</LegendKey>
        <LegendKey className="bg-[#1f9d68] dark:bg-[#26a670]">Landed in bank</LegendKey>
        <LegendKey className="bg-open">▲ surplus</LegendKey>
        <LegendKey className="bg-critical">▼ short</LegendKey>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full select-none"
        role="img"
        aria-labelledby={`${id}-t ${id}-d`}
        onMouseLeave={() => setHover(null)}
      >
        <title id={`${id}-t`}>Settlement calendar</title>
        <desc id={`${id}-d`}>
          Expected versus landed bank credits per value date for {days.length} days.
        </desc>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-line"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              dy="0.35em"
              textAnchor="end"
              className="fill-faint font-mono text-[10.5px]"
            >
              {t === 0 ? "0" : formatInrCompact(t)}
            </text>
          </g>
        ))}

        {days.map((d, i) => {
          const x0 = PAD.left + i * band + (band - (bar * 2 + GAP)) / 2;
          const xE = x0;
          const xA = x0 + bar + GAP;
          const isWeekend = ["Sat", "Sun"].includes(weekday(d.date));
          const status = d.delta === 0 ? null : d.delta > 0 ? "surplus" : "short";
          const active = hover === i;
          return (
            <g key={d.date}>
              <rect
                x={PAD.left + i * band}
                y={PAD.top}
                width={band}
                height={plotH}
                className={cn("fill-transparent", active && "fill-raised")}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${fmtDate(d.date)}: expected ${formatInr(d.expected)}, landed ${formatInr(d.actual)}`}
              />
              <Bar x={xE} yTop={y(d.expected)} base={baseline} w={bar} index={i} className="fill-[#3f5fe0] dark:fill-[#6079e8]" />
              <Bar
                x={xA}
                yTop={y(d.actual)}
                base={baseline}
                w={bar}
                index={i}
                className={cn(
                  status === null && "fill-[#1f9d68] dark:fill-[#26a670]",
                  status === "surplus" && "fill-open",
                  status === "short" && "fill-critical",
                )}
              />
              {status && (
                <text
                  x={i >= days.length - 2 ? xA + bar : i <= 1 ? xE : xA + bar / 2}
                  y={Math.min(y(d.actual), y(d.expected)) - 6}
                  textAnchor={i >= days.length - 2 ? "end" : i <= 1 ? "start" : "middle"}
                  className="fill-text font-mono text-[10px] font-medium"
                >
                  {status === "surplus" ? "▲" : "▼"} {formatInrCompact(Math.abs(d.delta))}
                </text>
              )}
              <text
                x={PAD.left + i * band + band / 2}
                y={H - 18}
                textAnchor="middle"
                className={cn("font-mono text-[10.5px]", isWeekend ? "fill-faint/70" : "fill-muted")}
              >
                {d.date.slice(8)}
              </text>
              <text
                x={PAD.left + i * band + band / 2}
                y={H - 6}
                textAnchor="middle"
                className={cn("text-[9px]", isWeekend ? "fill-faint/60" : "fill-faint")}
              >
                {weekday(d.date)}
              </text>
            </g>
          );
        })}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={baseline}
          y2={baseline}
          className="stroke-line-strong"
          strokeWidth={1}
        />
      </svg>

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 w-56 rounded-md bg-surface p-3 text-[12px] shadow-2 hairline fade-in"
          style={{
            left: `calc(${((PAD.left + hover * band + band / 2) / W) * 100}% - 7rem)`,
          }}
          role="status"
        >
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-medium text-text">{fmtDate(hovered.date, { withYear: true })}</span>
            <span className="text-faint">{weekday(hovered.date)}</span>
          </div>
          <Row label="Expected">
            <Amount paise={hovered.expected} size="sm" />
          </Row>
          <Row label="Landed">
            <Amount paise={hovered.actual} size="sm" />
          </Row>
          <Row label="Delta">
            <Delta paise={hovered.delta} className="text-[12.5px]" />
          </Row>
        </div>
      )}
      <figcaption className="sr-only">
        Bars grow from a shared baseline; a labelled delta marks days where the bank balance differs from
        what Razorpay processed.
      </figcaption>
    </figure>
  );
}

function Bar({
  x,
  yTop,
  base,
  w,
  index,
  className,
}: {
  x: number;
  yTop: number;
  base: number;
  w: number;
  index: number;
  className?: string;
}) {
  const h = Math.max(base - yTop, 0);
  if (h <= 0) return null;
  const r = Math.min(4, h, w / 2);
  // rounded data-end, square at the baseline
  const d = `M${x},${base} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + w - r} Q${x + w},${yTop} ${x + w},${yTop + r} V${base} Z`;
  return <path d={d} className={cn("bar-grow", className)}
      style={{ "--i": index } as React.CSSProperties} />;
}

function LegendKey({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-[2px]", className)} />
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}
