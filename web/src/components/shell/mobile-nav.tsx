"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { NavGroups } from "./sidebar";
import { Wordmark } from "./wordmark";

/** The sidebar as a left drawer on phones and tablets. Closes when a link is chosen. */
export function MobileNav({ openExceptions }: { openExceptions: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent side="left" className="flex flex-col bg-sunken">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="flex h-14 items-center border-b border-line px-4">
          <Link href={routes.landing} className="flex items-center gap-2.5" aria-label="Barabar home">
            <Wordmark />
          </Link>
        </div>
        <NavGroups openExceptions={openExceptions} layoutKey="mobile-active" onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
