"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.25, 1, 0.5, 1] as const;

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/**
 * Fades and rises a block the first time it scrolls into view.
 * With `stagger`, direct children animate one after another.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  stagger,
  as = "div",
  once = true,
  amount = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Seconds between each child. */
  stagger?: number;
  as?: "div" | "section" | "ul" | "li" | "tr" | "tbody";
  once?: boolean;
  amount?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });
  const reduced = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;

  if (reduced) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  const container: Variants = stagger
    ? {
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }
    : {
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE, delay } },
      };

  return (
    <Comp
      ref={ref}
      className={className}
      variants={container}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {stagger
        ? React.Children.map(children, (child, i) => (
            <motion.div key={i} variants={item} className="contents">
              {child}
            </motion.div>
          ))
        : children}
    </Comp>
  );
}

/** A child of a staggered parent that wants its own element (not `display: contents`). */
export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "tr";
}) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp variants={item} className={cn(className)}>
      {children}
    </Comp>
  );
}

/**
 * Staggers its direct children on first in-view; each child becomes its own
 * motion wrapper so it can carry layout classes.
 */
export function Stagger({
  children,
  className,
  itemClassName,
  gap = 0.06,
  delay = 0,
  amount = 0.1,
  max = 30,
}: {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  gap?: number;
  delay?: number;
  amount?: number;
  /** Children beyond this index render without animation. */
  max?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });
  const reduced = useReducedMotion();
  const kids = React.Children.toArray(children);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {kids.map((child, i) =>
        i < max ? (
          <motion.div key={i} variants={item} className={itemClassName}>
            {child}
          </motion.div>
        ) : (
          <div key={i} className={itemClassName}>
            {child}
          </div>
        ),
      )}
    </motion.div>
  );
}
