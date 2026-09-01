"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * A table row that navigates on click or Enter, without wrapping every cell in
 * an anchor. Links inside the row still work on their own.
 */
export function LinkRow({
  href,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLTableRowElement> & { href: string }) {
  const router = useRouter();
  const go = (e: React.MouseEvent | React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea")) return;
    router.push(href);
  };
  return (
    <tr
      {...rest}
      tabIndex={0}
      data-href={href}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter") go(e);
      }}
      className={cn(
        "row-accent cursor-pointer border-b border-line transition-colors hover:bg-raised/70 focus-visible:bg-raised/70 focus-visible:outline-none focus-visible:shadow-[inset_2px_0_0_var(--ring)]",
        className,
      )}
    >
      {children}
    </tr>
  );
}
