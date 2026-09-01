"use client";

import * as React from "react";
import dynamic from "next/dynamic";

type Variant = "layers" | "nodes" | "flow";

// Subpath import: the package barrel drags in every renderer, including ones
// that reference three.js exports removed in r165 and fail to compile.
const Panel = dynamic(
  () => import("@designcodeio/threeui/components/DiagnosticsPanel").then((m) => m.DiagnosticsPanel),
  { ssr: false, loading: () => null },
);

class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Small decorative illustration inside a source card. Static fallback if WebGL misbehaves. */
export function SourceArt({ variant }: { variant: Variant }) {
  const [reduced, setReduced] = React.useState(true);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="relative h-24 overflow-hidden rounded-md bg-sunken">
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:12px_12px]"
      />
      {!reduced && (
        <Boundary>
          <div className="absolute inset-0 [&>*]:h-full [&>*]:w-full">
            <Panel variant={variant} mode="dark" speed={0.6} size={0.8} opacity={0.9} />
          </div>
        </Boundary>
      )}
    </div>
  );
}
