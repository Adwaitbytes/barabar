import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline, non-blocking explanation of why an action could not run. */
export function ActionNotice({
  status,
  message,
  className,
}: {
  status: number | undefined;
  message: string;
  className?: string;
}) {
  const demo = status === 0;
  const needsKey = status === 503;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md px-3 py-2 text-[12.5px] hairline",
        demo || needsKey ? "bg-raised text-muted" : "bg-critical-dim text-critical-fg",
        className,
      )}
    >
      {demo || needsKey ? (
        <Info className="mt-0.5 size-3.5 shrink-0" />
      ) : (
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      )}
      <span>
        {demo
          ? "Demo data: actions need the API. Start it with `make api` and reload."
          : needsKey
            ? "Set ANTHROPIC_API_KEY on the API to enable the agent."
            : message}
      </span>
    </div>
  );
}
