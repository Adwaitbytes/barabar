"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { proofLines, type ProofLine } from "./proof-figures";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Typing state: which line is being typed and how many characters are visible.
 * `settled` marks the moment the last line resolves and the Σ turns green.
 */
type Phase =
  | { kind: "idle" }
  | { kind: "typing"; line: number; chars: number }
  | { kind: "settled" };

const CHAR_MS = 14;
const LINE_PAUSE_MS = 260;
const START_DELAY_MS = 700;

/** Wall-clock schedule: when each line starts typing, in ms from mount. */
function schedule(lines: ProofLine[]): { start: number; end: number }[] {
  let t = START_DELAY_MS;
  return lines.map((l) => {
    const start = t;
    const end = start + l.text.length * CHAR_MS;
    t = end + LINE_PAUSE_MS;
    return { start, end };
  });
}

const SCHEDULE = schedule(proofLines);
const TOTAL_MS = SCHEDULE[SCHEDULE.length - 1].end + LINE_PAUSE_MS;

/** Derive the phase from elapsed time so throttled timers cannot slow the typing. */
function phaseAt(elapsed: number): Phase {
  if (elapsed < START_DELAY_MS) return { kind: "idle" };
  if (elapsed >= TOTAL_MS) return { kind: "settled" };
  for (let i = 0; i < SCHEDULE.length; i++) {
    const { start, end } = SCHEDULE[i];
    if (elapsed < end) {
      const chars = Math.max(0, Math.min(proofLines[i].text.length, Math.floor((elapsed - start) / CHAR_MS)));
      return { kind: "typing", line: i, chars };
    }
    const next = SCHEDULE[i + 1];
    if (!next || elapsed < next.start) return { kind: "typing", line: i, chars: proofLines[i].text.length };
  }
  return { kind: "settled" };
}

export function ProofTyper({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const next = phaseAt(now - t0);
      setPhase((prev) => (samePhase(prev, next) ? prev : next));
      if (next.kind !== "settled") raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const effective: Phase = reduced ? { kind: "settled" } : phase;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-surface/70 shadow-3 backdrop-blur-md hairline",
        className,
      )}
      role="figure"
      aria-label="Proof tree: bank credit equals settlement net, which equals payments gross minus fee minus GST minus refunds"
    >
      <div className="flex h-9 items-center justify-between border-b border-line px-4">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
          proof · setl_2Jj4aF8gMQjDGO
        </span>
        <span className="mono text-[11px] text-faint">rules that produced each link →</span>
      </div>
      <ol className="mono px-4 py-3 text-[12px] leading-[1.9] sm:text-[12.5px] xl:text-[13px]">
        {proofLines.map((line, i) => (
          <Line key={i} line={line} index={i} phase={effective} />
        ))}
      </ol>
    </div>
  );
}

function samePhase(a: Phase, b: Phase): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "typing" && b.kind === "typing") return a.line === b.line && a.chars === b.chars;
  return true;
}

function Line({ line, index, phase }: { line: ProofLine; index: number; phase: Phase }) {
  const settled = phase.kind === "settled";
  const visibleChars = settled
    ? line.text.length
    : phase.kind === "typing"
      ? index < phase.line
        ? line.text.length
        : index === phase.line
          ? phase.chars
          : 0
      : 0;
  const started = visibleChars > 0;
  const complete = visibleChars >= line.text.length;
  const cursorHere = phase.kind === "typing" && phase.line === index;

  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]",
        !started && "invisible",
        line.sigma && "mt-1 border-t border-line pt-1",
      )}
      style={{ paddingLeft: `${line.depth * 1.25}rem` }}
    >
      <span
        className={cn(
          "min-w-0 overflow-hidden text-ellipsis whitespace-pre text-text",
          line.depth > 0 && !line.sigma && "text-muted",
          line.sigma && (settled ? "text-settled-fg" : "text-text"),
        )}
      >
        {line.text.slice(0, visibleChars)}
        {cursorHere && (
          <span className="ml-px inline-block h-[1.1em] w-[0.55ch] translate-y-[0.2em] bg-signal animate-[caret_1s_steps(1)_infinite]" />
        )}
      </span>
      <span
        className={cn(
          "text-right tabular-nums transition-opacity duration-300",
          complete ? "opacity-100" : "opacity-0",
          line.amount?.startsWith("−") ? "text-muted" : "text-text",
        )}
      >
        {line.amount ?? ""}
      </span>
      <span className="hidden justify-end sm:flex">
        {line.rule && <RuleChip id={line.rule} lit={complete} />}
        {line.sigma && (
          <span
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full transition-colors duration-500",
              settled ? "bg-settled text-black" : "bg-line text-transparent",
            )}
            aria-label={settled ? "residual zero, proof complete" : undefined}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
      </span>
    </li>
  );
}

function RuleChip({ id, lit }: { id: string; lit: boolean }) {
  return (
    <code
      className={cn(
        "inline-flex h-5 items-center rounded-[4px] px-1.5 text-[10.5px] transition-colors duration-500",
        lit ? "bg-settled-dim text-settled-fg" : "bg-sunken text-faint hairline",
      )}
    >
      {id}
    </code>
  );
}
