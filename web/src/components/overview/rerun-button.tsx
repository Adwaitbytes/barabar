"use client";

import { useState, useTransition } from "react";
import { Check, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hash } from "@/components/domain/chips";
import { rerunAction, type ActionResult } from "@/app/app/actions";
import type { RerunResult } from "@/lib/types";

export function RerunButton({ runId }: { runId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult<RerunResult> | null>(null);

  return (
    <div className="flex items-center gap-2">
      {result && result.ok && (
        <span
          className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-[12px] hairline fade-in"
          role="status"
        >
          {result.data.identical_outputs ? (
            <Check className="size-3.5 text-settled" />
          ) : (
            <X className="size-3.5 text-critical" />
          )}
          <span className="text-muted">
            {result.data.identical_outputs ? "Identical outputs" : "Outputs differ"} ·{" "}
            <Hash value={result.data.outputs_hash} />
            {" · "}
            <span className="mono">
              {result.data.diff.closed.length} closed / {result.data.diff.opened.length} opened /{" "}
              {result.data.diff.unchanged} same
            </span>
          </span>
        </span>
      )}
      {result && !result.ok && (
        <span className="text-[12px] text-critical-fg" role="alert">
          {result.error}
        </span>
      )}
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => start(async () => setResult(await rerunAction(runId)))}
      >
        <RotateCw className={pending ? "animate-spin" : undefined} />
        {pending ? "Re-running…" : "Re-run"}
      </Button>
    </div>
  );
}
