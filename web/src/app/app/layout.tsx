import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPaletteProvider } from "@/components/shell/command-palette";
import { activeRunId } from "@/lib/run";
import { getClosePack, listExceptions, listRuns, source } from "@/lib/api";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const runId = await activeRunId();
  const [runs, pack, exceptions, src] = await Promise.all([
    listRuns(),
    getClosePack(runId),
    listExceptions(runId),
    source(),
  ]);
  const active = runs.find((r) => r.run_id === runId) ?? pack.run;

  // Open, confident exceptions are money a person still has to decide on; the
  // low-confidence remainder is what the backend calls unexplained.
  const openConfident = exceptions
    .filter((e) => e.status === "open" && e.confidence >= 0.92)
    .reduce((s, e) => s + e.amount, 0);
  const band = {
    explained: Math.max(pack.headline.explained - openConfident, 0),
    open: openConfident,
    unexplained: pack.headline.unexplained,
    pct: pack.headline.rupees_explained_pct,
  };

  return (
    <TooltipProvider>
      <CommandPaletteProvider
        settlements={pack.settlements.map(({ settlement_id, amount, utr, settled_on }) => ({
          settlement_id,
          amount,
          utr,
          settled_on,
        }))}
        exceptions={exceptions
          .filter((e) => e.status === "open")
          .map(({ exc_id, type, amount }) => ({ exc_id, type, amount }))}
      >
        <div className="flex min-h-screen w-full">
          <Sidebar openExceptions={pack.exceptions_open} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar runs={runs} active={active} band={band} source={src} />
            <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
          </div>
        </div>
      </CommandPaletteProvider>
    </TooltipProvider>
  );
}
