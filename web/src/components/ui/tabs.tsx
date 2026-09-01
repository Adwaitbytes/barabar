"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

const ListCtx = React.createContext<string>("tabs");

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const id = React.useId();
  return (
    <ListCtx.Provider value={id}>
      <TabsPrimitive.List
        ref={ref}
        className={cn("inline-flex h-9 items-center gap-1 rounded-lg bg-sunken p-1", className)}
        {...props}
      />
    </ListCtx.Provider>
  );
});
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const group = React.useContext(ListCtx);
  const reduced = useReducedMotion();
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "group/tab relative inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted transition-colors hover:text-text data-[state=active]:text-text",
        className,
      )}
      {...props}
    >
      <ActiveIndicator group={group} reduced={reduced} />
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = "TabsTrigger";

/** Slides between triggers; rendered by whichever trigger is active. */
function ActiveIndicator({ group, reduced }: { group: string; reduced: boolean | null }) {
  return (
    <span className="absolute inset-0 hidden group-data-[state=active]/tab:block" aria-hidden>
      <motion.span
        layoutId={reduced ? undefined : `tab-indicator-${group}`}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className="absolute inset-0 rounded-md bg-surface shadow-1"
      />
    </span>
  );
}

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus:outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
