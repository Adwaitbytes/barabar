import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 h-5 text-[11px] font-medium leading-none whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-line bg-raised text-muted",
        settled: "border-transparent bg-settled-dim text-settled-fg",
        open: "border-transparent bg-open-dim text-open-fg",
        critical: "border-transparent bg-critical-dim text-critical-fg",
        signal: "border-transparent bg-signal-dim text-signal-fg",
        outline: "border-line-strong bg-transparent text-text",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
