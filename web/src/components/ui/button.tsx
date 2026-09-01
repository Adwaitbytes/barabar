"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "shine group/btn relative inline-flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-text text-bg shadow-1 hover:shadow-[0_0_0_1px_var(--line-strong),0_8px_24px_-8px_color-mix(in_oklab,var(--text)_55%,transparent)] dark:bg-white dark:text-black",
        secondary: "bg-surface text-text hairline shadow-1 hover:bg-raised hover:shadow-2",
        ghost: "text-muted hover:text-text hover:bg-raised",
        signal:
          "bg-signal text-white shadow-1 hover:brightness-110 hover:shadow-[0_8px_24px_-8px_var(--signal)] focus-visible:glow-ring",
        settled: "bg-settled-dim text-settled-fg hover:brightness-105",
        danger: "bg-critical-dim text-critical-fg hover:brightness-105",
        link: "text-signal-fg underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        xs: "h-7 px-2 text-xs rounded-sm",
        sm: "h-8 px-2.5 text-[13px]",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-[15px] rounded-lg",
        icon: "size-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and disables the control. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
