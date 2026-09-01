import Link from "next/link";
import { Wordmark } from "@/components/shell/wordmark";
import { routes } from "@/lib/routes";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Close pack", href: routes.overview },
      { label: "Exceptions", href: routes.exceptions },
      { label: "Proof trees", href: routes.settlements },
      { label: "Ask the books", href: routes.ask },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Exception taxonomy", href: "#names" },
      { label: "Matching tiers", href: "#match" },
      { label: "Determinism", href: "#proof" },
      { label: "GST on fees", href: routes.journal },
    ],
  },
  {
    title: "More",
    links: [
      { label: "GitHub", href: "https://github.com/Adwaitbytes/barabar" },
      { label: "API", href: "https://barabar-api.vercel.app/health" },
      { label: "Docs", href: routes.settings },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="relative border-t border-line bg-bg text-text">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.2fr_repeat(3,minmax(0,0.6fr))]">
        <div>
          <Link href={routes.landing} className="landing-mark inline-block" aria-label="Barabar home">
            <Wordmark size="lg" />
          </Link>
          <p className="mt-5 max-w-xs text-[14px] font-light leading-relaxed text-muted">
            Deterministic where money is decided. AI only on the tail.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-faint">{c.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("http") ? (
                    <a href={l.href} target="_blank" rel="noreferrer" className="landing-navlink text-[14px] text-muted transition-colors hover:text-text">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="landing-navlink text-[14px] text-muted transition-colors hover:text-text">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <span className="text-[15px] text-text">हर रुपये का हिसाब</span>
          <span className="mono text-[11px] uppercase tracking-[0.18em] text-faint">WebGL · Geist · India</span>
        </div>
      </div>
    </footer>
  );
}
