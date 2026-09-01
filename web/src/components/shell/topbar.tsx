"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Band } from "@/components/domain/band";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { closeMonth, relTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { Run } from "@/lib/types";
import type { DataSource } from "@/lib/api";
import { formatInr } from "@/lib/money";
import { ThemeToggle } from "./theme-toggle";
import { useCommandPalette } from "./command-palette";
import { setActiveRun } from "@/app/app/actions";

export interface BandFigures {
  explained: number;
  open: number;
  unexplained: number;
  pct: number;
}

export function Topbar({
  runs,
  active,
  band,
  source,
}: {
  runs: Run[];
  active: Run;
  band: BandFigures;
  source: DataSource;
}) {
  const [pending, start] = useTransition();
  const { open } = useCommandPalette();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-line bg-bg/80 px-4 backdrop-blur-md lg:px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-2 gap-2 pl-2 pr-1.5" disabled={pending}>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[13px] font-medium">{active.name}</span>
              <span className="text-[11px] text-faint">
                {closeMonth(active.as_of)} · as of {active.as_of}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 text-faint" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel>Runs</DropdownMenuLabel>
          {runs.map((r) => (
            <DropdownMenuItem
              key={r.run_id}
              onSelect={() => start(() => setActiveRun(r.run_id))}
              className="items-start"
            >
              <span className="mt-0.5 size-3.5 shrink-0">
                {r.run_id === active.run_id && <Check className="size-3.5" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px]">{r.name}</span>
                <span className="mono text-[11px] text-faint">
                  {r.run_id} · {relTime(r.finished_at)} ·{" "}
                  {formatInr(Number(r.metrics.unexplained_paise ?? 0), { compact: true })} open
                </span>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={routes.runs}>All runs & audit trail</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={routes.sources}>New run from sources</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
        <Band
          explained={band.explained}
          open={band.open}
          unexplained={band.unexplained}
          className="max-w-md flex-1"
        />
        <span className="mono shrink-0 text-[12px] text-muted">
          <span className="text-settled-fg">{band.pct.toFixed(2)}%</span> explained
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {source === "demo" ? (
          <Badge tone="outline" className="hidden sm:inline-flex">
            demo data
          </Badge>
        ) : (
          <Badge tone="settled" className="hidden sm:inline-flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full bg-settled breathe" />
              <span className="relative inline-flex size-1.5 rounded-full bg-settled" />
            </span>
            live
          </Badge>
        )}
        <Button variant="secondary" size="sm" onClick={open} className="group/k gap-2 pr-1.5">
          <Search className="size-3.5 text-faint transition-colors group-hover/k:text-signal" />
          <span className="hidden text-muted sm:inline">Ask or jump to…</span>
          <Kbd className="transition-colors group-hover/k:bg-signal-dim group-hover/k:text-signal-fg">⌘K</Kbd>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
