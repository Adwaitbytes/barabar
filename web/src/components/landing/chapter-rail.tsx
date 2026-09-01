"use client";

import { useEffect, useState } from "react";

const IDS = ["hero", "legs", "match", "names", "proof"] as const;

/** Right-edge dot rail: the active dot follows scroll; clicking a dot scrolls. */
export function ChapterRail() {
  const [active, setActive] = useState<string>("hero");

  useEffect(() => {
    const els = IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "-20% 0px -20% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Chapter progress"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-4 lg:flex"
    >
      {IDS.map((id, i) => (
        <a
          key={id}
          href={`#${id}`}
          aria-label={`Chapter ${i === 0 ? "00" : `0${i}`}`}
          aria-current={active === id ? "true" : undefined}
          className="group flex items-center gap-3"
        >
          <span className="mono pointer-events-none text-[10px] text-faint opacity-0 transition-opacity group-hover:opacity-100">
            0{i}
          </span>
          <span className="landing-rail-dot" data-active={active === id} />
        </a>
      ))}
    </nav>
  );
}
