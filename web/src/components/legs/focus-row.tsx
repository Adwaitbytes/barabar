"use client";

import { useEffect } from "react";

/** Scrolls the row with id `row-<focus>` into view once, after hydration. */
export function FocusRow({ focus }: { focus: string | undefined }) {
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`row-${focus}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }, [focus]);
  return null;
}
