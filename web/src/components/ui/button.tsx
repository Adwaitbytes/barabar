import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4 active:translate-y-px select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-text text-bg shadow-1 hover:opacity-90 dark:bg-white dark:text-black",
        secondary:
          "bg-surface text-text hairline shadow-1 hover:bg-raised",
        ghost: "text-muted hover:text-text hover:bg-raised",
        signal: "bg-signal text-white shadow-1 hover:brightness-110",
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
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
