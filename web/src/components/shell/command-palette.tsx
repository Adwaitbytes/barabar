"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  ArrowLeftRight,
  BookOpenText,
  ClipboardList,
  History,
  Inbox,
  Landmark,
  LayoutGrid,
  MessageSquareText,
  Settings2,
  Upload,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { routes } from "@/lib/routes";
import { formatInr } from "@/lib/money";
import { specFor } from "@/lib/exceptions";
import type { ClosePackSettlement, ExceptionItem } from "@/lib/types";

interface PaletteCtx {
  open: () => void;
}
const Ctx = React.createContext<PaletteCtx | null>(null);

export function useCommandPalette(): PaletteCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useCommandPalette outside provider");
  return ctx;
}

export function CommandPaletteProvider({
  settlements,
  exceptions,
  children,
}: {
  settlements: Pick<ClosePackSettlement, "settlement_id" | "amount" | "utr" | "settled_on">[];
  exceptions: Pick<ExceptionItem, "exc_id" | "type" | "amount">[];
  children: React.ReactNode;
}) {
  const [isOpen, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const nav = [
    { href: routes.overview, label: "Close pack", icon: LayoutGrid },
    { href: routes.exceptions, label: "Exceptions", icon: Inbox },
    { href: routes.ask, label: "Ask the books", icon: MessageSquareText },
    { href: routes.settlements, label: "Settlements", icon: ArrowLeftRight },
    { href: routes.bank, label: "Bank statement", icon: Landmark },
    { href: routes.ledger, label: "Sales ledger", icon: BookOpenText },
    { href: routes.journal, label: "Journal entries", icon: ClipboardList },
    { href: routes.sources, label: "Sources", icon: Upload },
    { href: routes.runs, label: "Runs & audit", icon: History },
    { href: routes.settings, label: "Rate card & rules", icon: Settings2 },
  ];

  const looksLikeQuestion = query.trim().split(/\s+/).length >= 3 || /\?$/.test(query);

  return (
    <Ctx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="top-[18%] max-w-xl -translate-y-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <Command label="Ask or jump to" shouldFilter={!looksLikeQuestion} className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Ask a question, or jump to a settlement, UTR or exception…"
                className="h-12 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-faint"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin">
              <Command.Empty className="px-3 py-8 text-center text-[13px] text-muted">
                Nothing by that name. Try a settlement id, a UTR, or an exception type.
              </Command.Empty>

              {looksLikeQuestion && (
                <Command.Group heading={<Heading>Ask the books</Heading>}>
                  <Item onSelect={() => go(`${routes.ask}?q=${encodeURIComponent(query.trim())}`)}>
                    <MessageSquareText className="size-4 text-signal" />
                    <span className="flex-1 truncate">
                      Ask <span className="text-text">“{query.trim()}”</span>
                    </span>
                    <span className="text-[11px] text-faint">answers cite proof trees</span>
                  </Item>
                </Command.Group>
              )}

              <Command.Group heading={<Heading>Go to</Heading>}>
                {nav.map((n) => (
                  <Item key={n.href} value={n.label} onSelect={() => go(n.href)}>
                    <n.icon className="size-4 text-faint" strokeWidth={1.75} />
                    {n.label}
                  </Item>
                ))}
              </Command.Group>

              <Command.Group heading={<Heading>Settlements</Heading>}>
                {settlements.map((s) => (
                  <Item
                    key={s.settlement_id}
                    value={`${s.settlement_id} ${s.utr ?? ""} ${s.settled_on}`}
                    onSelect={() => go(routes.settlement(s.settlement_id))}
                  >
                    <ArrowLeftRight className="size-4 text-faint" strokeWidth={1.75} />
                    <span className="mono text-[12.5px]">{s.settlement_id}</span>
                    <span className="mono text-[11.5px] text-faint">{s.utr ?? "no UTR"}</span>
                    <span className="mono ml-auto text-[12px] text-muted">{formatInr(s.amount)}</span>
                  </Item>
                ))}
              </Command.Group>

              <Command.Group heading={<Heading>Exceptions</Heading>}>
                {exceptions.map((e) => (
                  <Item
                    key={e.exc_id}
                    value={`${e.exc_id} ${e.type} ${specFor(e.type).title}`}
                    onSelect={() => go(routes.exception(e.exc_id))}
                  >
                    <Inbox className="size-4 text-faint" strokeWidth={1.75} />
                    <span>{specFor(e.type).title}</span>
                    <span className="mono text-[11.5px] text-faint">{e.exc_id}</span>
                    <span className="mono ml-auto text-[12px] text-muted">{formatInr(e.amount)}</span>
                  </Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-faint">{children}</span>
  );
}

function Item(props: React.ComponentProps<typeof Command.Item>) {
  return (
    <Command.Item
      {...props}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted data-[selected=true]:bg-raised data-[selected=true]:text-text"
    />
  );
}
