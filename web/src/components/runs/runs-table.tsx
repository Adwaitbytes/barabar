"use client";

import { useState, useTransition } from "react";
import { Check, RotateCw, Trash2 } from "lucide-react";
import { Amount } from "@/components/domain/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Hash } from "@/components/domain/chips";
import { Table, THead, TBody, Tr, Th, Td, TdNum } from "@/components/ui/table";
import { fmtDate, relTime } from "@/lib/format";
import { deleteRunAction, rerunAction, setActiveRun } from "@/app/app/actions";
import type { Run } from "@/lib/types";
import { cn } from "@/lib/utils";

function sourceLabel(src: Run["source"]): string {
  switch (src.kind) {
    case "synthetic":
      return `synthetic · ${src.profile} · seed ${src.seed}`;
    case "dataset":
      return `dataset · ${src.path.split("/").pop() ?? src.path}`;
    case "upload":
      return `upload · ${src.files.length} file${src.files.length === 1 ? "" : "s"}`;
    case "rerun":
      return `re-run of ${src.of}`;
  }
}

export function RunsTable({ runs, activeId }: { runs: Run[]; activeId: string }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Run | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const act = (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setNotice(null);
    start(async () => {
      try {
        await fn();
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <>
      {notice && (
        <p
          role={notice.tone === "err" ? "alert" : "status"}
          className={
            notice.tone === "err"
              ? "mb-3 rounded-md bg-critical-dim px-3 py-2 text-[12.5px] text-critical-fg"
              : "mb-3 rounded-md bg-settled-dim px-3 py-2 text-[12.5px] text-settled-fg"
          }
        >
          {notice.text}
        </p>
      )}
      <Table>
        <THead>
          <tr>
            <Th>Run</Th>
            <Th>As of</Th>
            <Th>Stage</Th>
            <Th>Source</Th>
            <Th className="text-right">Unexplained</Th>
            <Th>Outputs</Th>
            <Th>Finished</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </THead>
        <TBody>
          {runs.map((r, i) => {
            const isActive = r.run_id === activeId;
            const isBusy = pending && busy === r.run_id;
            return (
              <Tr key={r.run_id} style={{ "--i": i } as React.CSSProperties} className={cn("cascade accent-signal", isActive && "bg-raised/40")}>
                <Td className="w-full min-w-[220px] whitespace-normal">
                  <div className="flex items-center gap-2">
                    {isActive && <Check className="size-3.5 shrink-0 text-settled" aria-label="Active run" />}
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-text">{r.name}</div>
                      <div className="mono text-[11px] text-faint">{r.run_id}</div>
                    </div>
                  </div>
                </Td>
                <Td className="text-muted">{fmtDate(r.as_of, { withYear: true })}</Td>
                <Td>
                  <Badge tone={r.stage === "finished" ? "settled" : r.stage === "failed" ? "critical" : "open"}>
                    {r.stage}
                  </Badge>
                </Td>
                <Td className="w-px text-[12px] text-muted">{sourceLabel(r.source)}</Td>
                <TdNum>
                  <Amount
                    paise={Number(r.metrics.unexplained_paise ?? 0)}
                    tone={Number(r.metrics.unexplained_paise ?? 0) > 0 ? "critical" : "settled"}
                  />
                </TdNum>
                <Td>
                  <Hash value={r.outputs_hash} />
                </Td>
                <Td className="text-muted">{relTime(r.finished_at)}</Td>
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1">
                    {!isActive && (
                      <Button
                        size="xs"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => act(r.run_id, () => setActiveRun(r.run_id))}
                      >
                        Open
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={`Re-run ${r.name}`}
                      disabled={isBusy}
                      onClick={() =>
                        act(r.run_id, async () => {
                          const res = await rerunAction(r.run_id);
                          setNotice(
                            res.ok
                              ? {
                                  tone: "ok",
                                  text: `${res.data.run_id} created · outputs ${res.data.identical_outputs ? "identical" : "differ"} · ${res.data.diff.closed.length} closed, ${res.data.diff.opened.length} opened.`,
                                }
                              : { tone: "err", text: res.error },
                          );
                        })
                      }
                    >
                      <RotateCw className={isBusy ? "animate-spin" : undefined} />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={`Delete ${r.name}`}
                      disabled={isBusy}
                      onClick={() => setToDelete(r)}
                      className="hover:text-critical-fg"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>

      <Dialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogTitle className="text-base font-semibold">Delete this run?</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-muted">
            {toDelete?.name} <span className="mono text-faint">({toDelete?.run_id})</span> and its audit chain
            are removed from the store. The inputs stay content-addressed, so the same month can be re-run.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setToDelete(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                const r = toDelete;
                if (!r) return;
                setToDelete(null);
                act(r.run_id, async () => {
                  const res = await deleteRunAction(r.run_id);
                  setNotice(res.ok ? { tone: "ok", text: `Deleted ${r.run_id}.` } : { tone: "err", text: res.error });
                });
              }}
            >
              Delete run
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
