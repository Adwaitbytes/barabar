"use client";

import * as React from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { Amount } from "@/components/domain/amount";
import { fmtInt } from "@/lib/format";

/**
 * Tween from the last settled value to `target` while `enabled`; otherwise the
 * caller renders the target directly. State only changes from animation callbacks.
 */
function useCounted(target: number, duration: number, enabled: boolean): number {
  const [shown, setShown] = React.useState(0);
  const settled = React.useRef(0);

  React.useEffect(() => {
    if (!enabled) return;
    const controls = animate(settled.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => {
        settled.current = target;
        setShown(target);
      },
    });
    return () => controls.stop();
  }, [target, duration, enabled]);

  return shown;
}

/** Animates paise to their exact final value, formatted through <Amount>. */
export function CountUp({
  paise,
  duration = 1.1,
  ...rest
}: { paise: number; duration?: number } & Omit<React.ComponentProps<typeof Amount>, "paise">) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const enabled = !reduced && inView;
  const shown = useCounted(paise, duration, enabled);
  return (
    <span ref={ref} className="inline-block">
      <Amount paise={enabled ? shown : paise} {...rest} />
    </span>
  );
}

/** Integer counter for counts (exceptions, settlements). */
export function NumberTicker({
  value,
  duration = 0.9,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const enabled = !reduced && inView;
  const shown = useCounted(value, duration, enabled);
  return (
    <span ref={ref} className={className}>
      {fmtInt(enabled ? shown : value)}
    </span>
  );
}
