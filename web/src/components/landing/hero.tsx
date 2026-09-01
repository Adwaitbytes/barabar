"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { animate, motion, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { formatInr } from "@/lib/money";
import { ArcBackground, StructureScene } from "./shaders";
import { Cta, EASE, Parallax } from "./motion";
import { ProofTyper } from "./proof-typer";
import { proofFigures } from "./proof-figures";
import { useReducedMotion } from "./use-reduced-motion";

const TEASERS = [
  { n: "01", label: "Three legs", href: "#legs" },
  { n: "02", label: "The match", href: "#match" },
  { n: "03", label: "Every rupee named", href: "#names" },
  { n: "04", label: "The proof", href: "#proof" },
];

/* The headline figure resolves from gross through each deduction to the bank net. */
const STEPS = [
  { label: "gross captured", to: proofFigures.gross },
  { label: `− PG fee ${formatInr(proofFigures.fee)}`, to: proofFigures.gross - proofFigures.fee },
  { label: `− GST on fee ${formatInr(proofFigures.tax)}`, to: proofFigures.paymentsNet },
  { label: `− refunds ${formatInr(proofFigures.refundTotal)}`, to: proofFigures.net },
] as const;

function ResolvingFigure() {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? proofFigures.net : proofFigures.gross);
  const [step, setStep] = useState(reduced ? STEPS.length - 1 : 0);
  const [done, setDone] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let current: number = proofFigures.gross;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 1500));
      for (let i = 1; i < STEPS.length; i++) {
        if (cancelled) return;
        setStep(i);
        const to = STEPS[i].to;
        await animate(current, to, {
          duration: 0.7,
          ease: EASE,
          onUpdate: (v) => setValue(v),
        }).finished;
        current = to;
        await new Promise((r) => setTimeout(r, 380));
      }
      if (!cancelled) setDone(true);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [reduced]);

  return (
    <span className="relative inline-block">
      <span className={cn("mono tabular-nums transition-colors duration-500", done ? "text-settled" : "text-text")}>
        {formatInr(Math.round(value))}
      </span>
      <span
        aria-hidden
        className={cn(
          "mono absolute -top-5 left-0 text-[11px] tracking-[0.08em] transition-opacity duration-300 sm:-top-6 sm:text-[12px]",
          done ? "text-settled" : "text-faint",
        )}
      >
        {done ? "= net to bank · residual ₹0.00" : STEPS[step].label}
      </span>
    </span>
  );
}

function CursorGlow() {
  const reduced = useReducedMotion();
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const sx = useSpring(x, { stiffness: 60, damping: 20 });
  const sy = useSpring(y, { stiffness: 60, damping: 20 });
  const frame = useRef(0);
  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        x.set(e.clientX);
        y.set(e.clientY);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, x, y]);
  if (reduced) return null;
  return (
    <motion.div
      aria-hidden
      style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-[1] size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(123,147,255,0.14),transparent_60%)] mix-blend-screen"
    />
  );
}

export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="dark landing-grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-bg text-text"
    >
      {/* the world */}
      <ArcBackground variant="signal-particles" mobile fade={false} />
      <StructureScene
        variant="logic-core"
        className="pointer-events-none absolute -right-[10%] bottom-[-6%] hidden h-[70vh] w-[62vw] opacity-70 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_55%,black_30%,transparent_75%)] md:block"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_30%_40%,transparent_20%,var(--bg)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
      <CursorGlow />

      {/* vertical mark on the right edge */}
      <span aria-hidden className="landing-vertical absolute right-6 top-28 hidden lg:block">
        बराबर · हर रुपये का हिसाब
      </span>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-40 pt-32 sm:px-8 sm:pt-40">
        <Parallax speed={0.18} className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1, ease: EASE }}
            className="mb-7 flex items-center gap-2.5 text-[11px] uppercase tracking-[0.22em] text-muted"
          >
            <span className="size-1.5 rounded-full bg-settled shadow-[0_0_10px_var(--settled)]" />
            Chapter 00 — The question
          </motion.p>
          <motion.h1
            id="hero-title"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2, ease: EASE }}
            className="text-[clamp(46px,7.2vw,96px)] font-normal leading-[1.02] tracking-[-0.012em] text-text"
          >
            <span className="block">Why did</span>
            <span className="mt-6 block font-medium sm:mt-7">
              <ResolvingFigure />
            </span>
            <span className="block">land in my bank?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.45, ease: EASE }}
            className="mt-8 max-w-xl text-[16px] font-light leading-relaxed text-muted sm:text-[18px]"
          >
            Barabar reads the Razorpay settlement, the bank statement and the sales ledger, and
            answers to the paise. Every link names the rule that made it. Every unmatched rupee
            gets a typed exception. Deterministic where money is decided, AI only on the tail.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.6, ease: EASE }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Cta href={routes.overview} magnetic>
              Open the close pack
              <ArrowUpRight className="size-4" />
            </Cta>
            <Cta href="#legs" variant="outline">
              Scroll to reconcile
              <ArrowDown className="landing-cue size-4" />
            </Cta>
          </motion.div>
        </Parallax>

        {/* teasers */}
        <motion.ol
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2 }}
          className="mt-auto grid max-w-3xl grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-4"
        >
          {TEASERS.map((t) => (
            <li key={t.n}>
              <a href={t.href} className="group block">
                <span className="mono block text-[11px] tracking-[0.18em] text-faint">{t.n}</span>
                <span className="mt-1 block text-[14px] text-muted transition-colors group-hover:text-text">
                  {t.label}
                </span>
                <span className="mt-2 block h-px w-8 bg-line transition-[width,background-color] duration-300 group-hover:w-14 group-hover:bg-settled" />
              </a>
            </li>
          ))}
        </motion.ol>
      </div>

      {/* the giant word */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, delay: 1.3, ease: EASE }}
        className="landing-giant font-sans"
      >
        BARABAR
      </motion.div>

      {/* proof window, bottom right */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 2.2, ease: EASE }}
        className="absolute bottom-8 right-6 z-20 hidden w-[380px] origin-bottom-right xl:block"
      >
        <div className="mb-2 flex items-center justify-between text-[10.5px] uppercase tracking-[0.18em] text-faint">
          <span>Live proof · {proofFigures.settlementId}</span>
          <span className="mono">A1 · B1 · B2 · B3</span>
        </div>
        <div className="origin-top-left scale-[0.72] [width:528px]">
          <ProofTyper />
        </div>
      </motion.div>
    </section>
  );
}
