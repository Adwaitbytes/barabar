"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import "@designcodeio/threeui/style.css";
import { cn } from "@/lib/utils";
import { useMounted, useReducedMotion } from "./use-reduced-motion";

/* ------------------------------------------------------------------
   Every ThreeUI renderer on the landing page goes through one gate:
   mounted on the client, near the viewport, motion allowed, wide enough.
   Subpath imports only: the package barrel bundles scenes built against an
   older three.js and breaks the build.
   ------------------------------------------------------------------ */

const PredictiveArcCanvas = dynamic(
  () => import("@designcodeio/threeui/components/PredictiveArcCanvas").then((m) => m.PredictiveArcCanvas),
  { ssr: false, loading: () => null },
);
const DiagnosticsPanel = dynamic(
  () => import("@designcodeio/threeui/components/DiagnosticsPanel").then((m) => m.DiagnosticsPanel),
  { ssr: false, loading: () => null },
);
const StructureFlowCollection = dynamic(
  () =>
    import("@designcodeio/threeui/components/StructureFlowCollection").then(
      (m) => m.StructureFlowCollection,
    ),
  { ssr: false, loading: () => null },
);
const PerformanceGauges = dynamic(
  () => import("@designcodeio/threeui/components/PerformanceGauges").then((m) => m.PerformanceGauges),
  { ssr: false, loading: () => null },
);
const HalftoneFlow = dynamic(
  () => import("@designcodeio/threeui/components/HalftoneFlow").then((m) => m.HalftoneFlow),
  { ssr: false, loading: () => null },
);

function useMediaQuery(query: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Near = within 1.5 viewports; renderers unmount again once far away. */
function useNear<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setNear(e.isIntersecting);
      },
      { rootMargin: "150% 0px 150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, near];
}

export function useShaderGate(opts?: { mobile?: boolean }) {
  const [ref, near] = useNear<HTMLDivElement>();
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const wide = useMediaQuery("(min-width: 768px)", true);
  const live = mounted && near && !reduced && (opts?.mobile === true || wide);
  return { ref, live };
}

class ShaderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    // A renderer that throws must never take the page down; the poster stays.
    console.error("[landing] shader failed, keeping poster", err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type PosterKind = "dots" | "grid" | "lines";

const POSTERS: Record<PosterKind, React.CSSProperties> = {
  dots: {
    backgroundImage: "radial-gradient(circle, rgba(160,170,200,0.28) 0 1px, transparent 1.5px)",
    backgroundSize: "16px 16px",
  },
  grid: {
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  },
  lines: {
    backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 12px)",
  },
};

export function Poster({ kind, hidden }: { kind: PosterKind; hidden: boolean }) {
  return (
    <div
      className={cn("absolute inset-0 transition-opacity duration-1000", hidden ? "opacity-0" : "opacity-100")}
      style={{
        ...POSTERS[kind],
        maskImage: "radial-gradient(ellipse 75% 65% at 50% 45%, black 25%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 45%, black 25%, transparent 100%)",
      }}
    />
  );
}

function Live({ children }: { children: ReactNode }) {
  return (
    <ShaderBoundary>
      <div className="absolute inset-0 animate-[fade-in_1.2s_ease-out_both]">{children}</div>
    </ShaderBoundary>
  );
}

/* ---------- backgrounds ---------- */

export type ArcVariant = "signal-particles" | "data-pixel" | "override-grid" | "predictive";

export function ArcBackground({
  variant,
  speed = 0.7,
  brightness = 0.9,
  hue = 0,
  mobile = false,
  className,
  fade = true,
}: {
  variant: ArcVariant;
  speed?: number;
  brightness?: number;
  hue?: number;
  mobile?: boolean;
  className?: string;
  /** Fade edges into the page background so type always wins. */
  fade?: boolean;
}) {
  const { ref, live } = useShaderGate({ mobile });
  const cls = "pointer-events-none absolute inset-0 h-full w-full";
  return (
    <div ref={ref} className={cn("shader-frame pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <Poster kind="dots" hidden={live} />
      {live && (
        <Live>
          {variant === "data-pixel" ? (
            <PredictiveArcCanvas variant="data-pixel" className={cls} />
          ) : variant === "predictive" ? (
            <PredictiveArcCanvas variant="predictive" className={cls} />
          ) : (
            <PredictiveArcCanvas
              variant={variant}
              mode="dark"
              speed={speed}
              brightness={brightness}
              hue={hue}
              className={cls}
            />
          )}
        </Live>
      )}
      {fade && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_40%,transparent_35%,var(--bg)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
        </>
      )}
    </div>
  );
}

export function HalftoneBackground({ className }: { className?: string }) {
  const { ref, live } = useShaderGate();
  return (
    <div ref={ref} className={cn("shader-frame pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <Poster kind="lines" hidden={live} />
      {live && (
        <Live>
          <HalftoneFlow mode="dark" className="pointer-events-none absolute inset-0 h-full w-full" />
        </Live>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_30%,var(--bg)_100%)]" />
    </div>
  );
}

/* ---------- panels ---------- */

export type LegVariant = "layers" | "nodes" | "flow";

export function LegPanel({ variant, className }: { variant: LegVariant; className?: string }) {
  const { ref, live } = useShaderGate();
  return (
    <div ref={ref} className={cn("shader-frame relative overflow-hidden", className)} aria-hidden>
      <Poster kind="grid" hidden={live} />
      {live && (
        <Live>
          <DiagnosticsPanel
            variant={variant}
            mode="dark"
            speed={0.8}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        </Live>
      )}
    </div>
  );
}

export type SceneVariant = "logic-core" | "data-field" | "dimensional-field" | "topology-field" | "dot-matrix";

export function StructureScene({
  variant,
  className,
  hue = 0,
}: {
  variant: SceneVariant;
  className?: string;
  hue?: number;
}) {
  const { ref, live } = useShaderGate();
  const cls = "pointer-events-none absolute inset-0 h-full w-full";
  return (
    <div ref={ref} className={cn("shader-frame relative overflow-hidden", className)} aria-hidden>
      <Poster kind="grid" hidden={live} />
      {live && (
        <Live>
          {variant === "dot-matrix" ? (
            <StructureFlowCollection variant="dot-matrix" className={cls} />
          ) : (
            <StructureFlowCollection variant={variant} mode="dark" hue={hue} className={cls} />
          )}
        </Live>
      )}
    </div>
  );
}

export function Gauge({ className }: { className?: string }) {
  const { ref, live } = useShaderGate();
  return (
    <div ref={ref} className={cn("shader-frame relative overflow-hidden", className)} aria-hidden>
      <Poster kind="dots" hidden={live} />
      {live && (
        <Live>
          <PerformanceGauges
            variant="tachometer"
            mode="dark"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        </Live>
      )}
    </div>
  );
}
