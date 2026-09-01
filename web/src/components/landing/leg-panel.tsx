"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useMounted, useReducedMotion } from "./use-reduced-motion";

const DiagnosticsPanel = dynamic(
  () => import("@designcodeio/threeui").then((m) => m.DiagnosticsPanel),
  { ssr: false, loading: () => null },
);

export type LegVariant = "layers" | "nodes" | "flow";

/**
 * One illustrated "leg" of the reconciliation. The Canvas 2D panel only mounts
 * once it scrolls into view, so the landing page never pays for three sandboxes up front.
 */
export function LegPanel({ variant, className }: { variant: LegVariant; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const mode = mounted && resolvedTheme === "light" ? "light" : "dark";

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  const live = mounted && inView && !reduced;

  return (
    <div
      ref={ref}
      className={cn("shader-frame relative h-44 w-full overflow-hidden rounded-lg bg-sunken", className)}
      aria-hidden
    >
      <div
        className={cn("absolute inset-0 transition-opacity duration-700", live ? "opacity-0" : "opacity-100")}
        style={{
          backgroundImage:
            "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />
      {live && (
        <div className="absolute inset-0 animate-[fade-in_0.8s_ease-out_both]">
          <DiagnosticsPanel
            variant={variant}
            mode={mode}
            speed={0.8}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        </div>
      )}
    </div>
  );
}
