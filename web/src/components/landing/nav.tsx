import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const links = [
  { href: "#product", label: "Product" },
  { href: "#exceptions", label: "Exceptions" },
  { href: "#determinism", label: "Determinism" },
];

export function LandingNav() {
  return (
    <nav
      aria-label="Site"
      className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8"
    >
      <Link href={routes.landing} aria-label="Barabar home" className="rounded-sm">
        <Wordmark />
      </Link>
      <ul className="hidden items-center gap-7 md:flex">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="rounded-sm text-[13px] text-muted transition-colors hover:text-text"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <Button asChild variant="secondary" size="sm">
        <Link href={routes.overview}>
          Open app
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </nav>
  );
}
