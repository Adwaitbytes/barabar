import { Fingerprint } from "lucide-react";
import { CopyButton } from "@/components/domain/copy-button";
import { Hint } from "@/components/ui/tooltip";
import type { Run } from "@/lib/types";

function Cell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</span>
      {value ? (
        <Hint label={value}>
          <code className="truncate text-[12px] text-muted">{value.slice(0, 12)}</code>
        </Hint>
      ) : (
        <span className="text-faint">—</span>
      )}
      {value && <CopyButton value={value} label={`Copy ${label}`} />}
    </div>
  );
}

export function DeterminismStrip({ run }: { run: Run }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg bg-sunken px-4 py-3 hairline">
      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
        <Fingerprint className="size-3.5" />
        Same inputs + same config + same code ⇒ same outputs.
      </span>
      <Cell label="inputs" value={run.inputs_hash} />
      <Cell label="config" value={run.config_hash} />
      <Cell label="outputs" value={run.outputs_hash} />
      <Cell label="code" value={run.code_version} />
    </div>
  );
}
