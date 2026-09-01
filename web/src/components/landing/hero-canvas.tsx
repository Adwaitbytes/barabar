"use client";

import dynamic from "next/dynamic";
import "@designcodeio/threeui/style.css";
import { useMounted, useReducedMotion } from "./use-reduced-motion";

// WebGL stays out of the initial chunk: the shader only loads on the client, after paint.
const PredictiveArcCanvas = dynamic(
  () => import("@designcodeio/threeui").then((m) => m.PredictiveArcCanvas),
  { ssr: false, loading: () => null },
);

/**
 * Signal-particle field behind the hero: three sources, soft connective pulses.
 * A dotted-grid poster holds the space until the shader mounts, and stays put
 * for anyone who asked for reduced motion.
 */
export function HeroCanvas() {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const live = mounted && !reduced;

  return (
    <div className="shader-frame pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: live ? 0 : 1,
          backgroundImage:
            "radial-gradient(circle at center, rgba(160,170,200,0.28) 0 1px, transparent 1.5px)",
          backgroundSize: "16px 16px",
          backgroundPosition: "center",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)",
        }}
      />
      {live && (
        <div className="absolute inset-0 animate-[fade-in_1.2s_ease-out_both]">
          <PredictiveArcCanvas
            variant="signal-particles"
            mode="dark"
            speed={0.7}
            brightness={0.85}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        </div>
      )}
      {/* Vignette + fade to page background so the type always wins. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_30%,transparent_40%,var(--bg)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}
