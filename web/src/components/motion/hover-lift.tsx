"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Cards rise 2px and gain shadow on hover; a cursor-tracked spotlight follows. */
export function HoverLift({
  children,
  className,
  spotlight = true,
  tilt = false,
}: {
  children: React.ReactNode;
  className?: string;
  spotlight?: boolean;
  tilt?: boolean;
}) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    if (tilt && !reduced) {
      const rx = ((y / r.height) - 0.5) * -3;
      const ry = ((x / r.width) - 0.5) * 3;
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
    }
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn("group/lift relative", spotlight && "spotlight", tilt && "tilt", className)}
    >
      {children}
    </motion.div>
  );
}
