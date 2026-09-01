"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";

/** Streams text in at ~cps characters per second; reduced motion renders at once. */
export function Typewriter({
  text,
  cps = 90,
  className,
  onDone,
}: {
  text: string;
  cps?: number;
  className?: string;
  onDone?: () => void;
}) {
  const reduced = useReducedMotion();
  const [n, setN] = React.useState(0);
  const done = React.useRef(onDone);
  React.useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  React.useEffect(() => {
    if (reduced) {
      done.current?.();
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const shown = Math.min(text.length, Math.floor(((now - start) / 1000) * cps));
      setN(shown);
      if (shown < text.length) raf = requestAnimationFrame(tick);
      else done.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, cps, reduced]);

  const shown = reduced ? text.length : n;
  return (
    <span className={className}>
      {text.slice(0, shown)}
      {shown < text.length && (
        <span aria-hidden className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] bg-signal animate-[caret_1s_steps(1)_infinite]" />
      )}
    </span>
  );
}
