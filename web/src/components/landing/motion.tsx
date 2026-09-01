"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./use-reduced-motion";

export const EASE = [0.25, 1, 0.5, 1] as const;

/* ---------- reveal on scroll ---------- */

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "p" | "span";
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduced ? false : "hidden"}
      whileInView="show"
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
      variants={revealVariants}
      transition={{ delay }}
    >
      {children}
    </M>
  );
}

/** Children reveal one after another. */
export function Stagger({
  children,
  className,
  step = 0.06,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  as?: "div" | "ul" | "ol";
}) {
  const reduced = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduced ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-8% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: step } } }}
    >
      {children}
    </M>
  );
}

export function Item({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const M = motion[as];
  return (
    <M className={className} variants={revealVariants}>
      {children}
    </M>
  );
}

/** Section heading with a clip-path wipe. */
export function Wipe({ children, className, as = "h2", id }: { children: ReactNode; className?: string; as?: "h2" | "h3" | "p"; id?: string }) {
  const reduced = useReducedMotion();
  const M = motion[as];
  return (
    <M
      id={id}
      className={className}
      initial={reduced ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0.4 }}
      whileInView={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      {children}
    </M>
  );
}

/* ---------- eyebrow + heading block ---------- */

export function SectionHead({
  eyebrow,
  title,
  body,
  align = "left",
  className,
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Reveal>
        <p className="mono mb-4 text-[11.5px] uppercase tracking-[0.18em] text-settled">{eyebrow}</p>
      </Reveal>
      <Wipe
        id={id}
        className="text-[clamp(30px,4.2vw,52px)] font-semibold leading-[1.02] tracking-[-0.035em] text-text"
      >
        {title}
      </Wipe>
      {body && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-[16px] leading-relaxed text-muted sm:text-[17px]">{body}</p>
        </Reveal>
      )}
    </div>
  );
}

/* ---------- count up ---------- */

export function useCountUp(target: number, opts?: { duration?: number; start?: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [value, setValue] = useState(opts?.start ?? 0);
  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(opts?.start ?? 0, target, {
      duration: opts?.duration ?? 1.6,
      ease: EASE,
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, target, reduced, opts?.duration, opts?.start]);
  return { ref, value: reduced ? target : value };
}

/* ---------- magnetic + shine buttons ---------- */

export function Magnetic({
  children,
  className,
  strength = 12,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 320, damping: 22, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 320, damping: 22, mass: 0.4 });
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (reduced || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        x.set(Math.max(-strength, Math.min(strength, dx * 0.25)));
        y.set(Math.max(-strength, Math.min(strength, dy * 0.25)));
      });
    },
    [reduced, strength, x, y],
  );
  const reset = useCallback(() => {
    cancelAnimationFrame(frame.current);
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}

type CtaProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  size?: "md" | "lg";
  className?: string;
  magnetic?: boolean;
};

/** Landing CTA: shine sweep on hover, press scale, animated border for outline. */
export function Cta({ href, children, variant = "primary", size = "lg", className, magnetic = false }: CtaProps) {
  const base = cn(
    "landing-cta group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-[transform,box-shadow,background-color,color] duration-200 ease-out active:scale-[0.97] select-none",
    size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-[14px]",
    variant === "primary" &&
      "bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_-10px_rgba(255,255,255,0.35)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_14px_40px_-10px_rgba(255,255,255,0.45)] hover:-translate-y-0.5",
    variant === "ghost" && "bg-white/[0.06] text-text hover:bg-white/[0.1] hairline",
    variant === "outline" && "landing-cta-outline text-text",
    className,
  );
  const inner = (
    <Link href={href} className={base}>
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      <span aria-hidden className="landing-shine" />
    </Link>
  );
  return magnetic ? <Magnetic>{inner}</Magnetic> : inner;
}

/* ---------- tilt card with cursor spotlight ---------- */

export function TiltCard({
  children,
  className,
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 260, damping: 24 });
  const sry = useSpring(ry, { stiffness: 260, damping: 24 });
  const frame = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
      if (!reduced) {
        ry.set((px - 0.5) * max * 2);
        rx.set((0.5 - py) * max * 2);
      }
    });
  };
  const reset = () => {
    cancelAnimationFrame(frame.current);
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      className={cn("landing-spot group relative rounded-2xl", className)}
    >
      {children}
    </motion.div>
  );
}

/* ---------- scroll progress ---------- */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-settled shadow-[0_0_12px_var(--settled)]"
    />
  );
}

/* ---------- parallax ---------- */

export function Parallax({ children, className, speed = 0.25 }: { children: ReactNode; className?: string; speed?: number }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], [0, reduced ? 0 : 900 * speed]);
  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
