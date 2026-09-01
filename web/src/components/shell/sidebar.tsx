"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BookOpenText,
  Building2,
  ClipboardList,
  History,
  Inbox,
  Landmark,
  LayoutGrid,
  MessageSquareText,
  Settings2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { Wordmark } from "./wordmark";

type Item = { href: string; label: string; icon: React.ElementType; count?: number; exact?: boolean };

export function Sidebar({ openExceptions }: { openExceptions: number }) {
  const pathname = usePathname();

  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Close",
      items: [
        { href: routes.overview, label: "Close pack", icon: LayoutGrid, exact: true },
        { href: routes.exceptions, label: "Exceptions", icon: Inbox, count: openExceptions },
        { href: routes.ask, label: "Ask the books", icon: MessageSquareText },
      ],
    },
    {
      title: "Three legs",
      items: [
        { href: routes.settlements, label: "Settlements", icon: ArrowLeftRight },
        { href: routes.bank, label: "Bank statement", icon: Landmark },
        { href: routes.ledger, label: "Sales ledger", icon: BookOpenText },
      ],
    },
    {
      title: "Output",
      items: [
        { href: routes.journal, label: "Journal entries", icon: ClipboardList },
        { href: routes.sources, label: "Sources", icon: Upload },
        { href: routes.runs, label: "Runs & audit", icon: History },
        { href: routes.settings, label: "Rate card & rules", icon: Settings2 },
      ],
    },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-line bg-sunken/60 lg:flex">
      <div className="flex h-14 items-center px-4">
        <Link href={routes.landing} className="flex items-center gap-2.5" aria-label="Barabar home">
          <Wordmark />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin" aria-label="Primary">
        {groups.map((g) => (
          <div key={g.title} className="mt-4">
            <div className="px-2 pb-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">
              {g.title}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                        active
                          ? "bg-surface text-text shadow-1 hairline"
                          : "text-muted hover:bg-raised hover:text-text",
                      )}
                    >
                      <it.icon
                        className={cn("size-4 shrink-0", active ? "text-text" : "text-faint group-hover:text-muted")}
                        strokeWidth={1.75}
                      />
                      <span className="flex-1 truncate">{it.label}</span>
                      {typeof it.count === "number" && it.count > 0 && (
                        <span className="mono rounded-full bg-open-dim px-1.5 text-[11px] leading-5 text-open-fg">
                          {it.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-4 py-3 text-[11px] text-faint">
        <div className="flex items-center gap-1.5">
          <Building2 className="size-3.5" />
          Deterministic where money is decided.
        </div>
      </div>
    </aside>
  );
}
