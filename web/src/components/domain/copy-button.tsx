"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, className, label = "Copy" }: { value: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard unavailable, nothing to recover */
        }
      }}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-[5px] text-faint transition-colors hover:bg-raised hover:text-text",
        className,
      )}
    >
      {done ? <Check className="size-3.5 text-settled" /> : <Copy className="size-3.5" />}
    </button>
  );
}
