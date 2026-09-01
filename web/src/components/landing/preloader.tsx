"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * "बराबर" (equal) fades in, then a status line, then the page. Under 1.2 s total;
 * skipped entirely when the visitor asked for less motion.
 */
export function Preloader() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (reduced) return;
    const t1 = setTimeout(() => setStage(1), 450);
    const t2 = setTimeout(() => setStage(2), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="landing-preloader" data-done={stage === 2} aria-hidden={stage === 2}>
      <div className="flex flex-col items-center gap-4">
        <span
          className="text-[44px] font-medium tracking-[0.08em] text-text transition-opacity duration-500"
          style={{ opacity: stage >= 0 ? 1 : 0 }}
        >
          बराबर
        </span>
        <span
          className="mono text-[11px] uppercase tracking-[0.22em] text-faint transition-opacity duration-400"
          style={{ opacity: stage >= 1 ? 1 : 0 }}
        >
          Raising the month&apos;s books
        </span>
      </div>
    </div>
  );
}
