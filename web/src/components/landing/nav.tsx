"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { Wordmark } from "@/components/shell/wordmark";
import { Cta, ScrollProgress } from "./motion";

export const CHAPTERS = [
  { id: "legs", label: "Settlements", alt: "22" },
  { id: "names", label: "Exceptions", alt: "25 types" },
  { id: "proof", label: "Proof", alt: "Σ" },
  { id: "match", label: "Close", alt: "T+2" },
] as const;

/** Sticky glass nav: scroll progress on top, mono alt labels, sheet on mobile. */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <ScrollProgress />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,box-shadow] duration-300",
          scrolled ? "bg-bg/70 shadow-[inset_0_-1px_0_var(--line)] backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href={routes.landing} aria-label="Barabar home" className="landing-mark">
            <Wordmark />
          </Link>

          <nav aria-label="Chapters" className="hidden items-center gap-8 md:flex">
            {CHAPTERS.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className="landing-navlink flex items-baseline gap-1.5 text-[13px] text-muted transition-colors hover:text-text"
              >
                {c.label}
                <span className="mono text-[10px] tracking-[0.08em] text-faint">{c.alt}</span>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Cta href={routes.overview} size="md" variant="primary" className="hidden sm:inline-flex">
              Open app
              <ArrowUpRight className="size-4" />
            </Cta>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex size-10 items-center justify-center rounded-full text-text transition-colors hover:bg-white/[0.06] md:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-bg px-6 pb-8 pt-24 transition-[opacity,transform] duration-300 ease-out md:hidden",
          open ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        )}
        aria-hidden={!open}
      >
        <ul className="divide-y divide-line">
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between py-5 text-[22px] font-medium text-text"
              >
                <span className="flex items-baseline gap-3">
                  <span className="mono text-[11px] text-faint">0{i + 1}</span>
                  {c.label}
                </span>
                <span className="mono text-[12px] text-faint">{c.alt}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <Cta href={routes.overview} className="w-full">
            Open the close pack
            <ArrowUpRight className="size-4" />
          </Cta>
        </div>
      </div>
    </>
  );
}
