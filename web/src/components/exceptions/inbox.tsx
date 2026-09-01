"use client";

import { motion } from "motion/react";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck, ChevronRight, Search, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/domain/amount";
import {
  Confidence,
  EntityRef,
  ExceptionStatusPill,
  TierBadge,
} from "@/components/domain/chips";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/shell/page-header";
import { specFor } from "@/lib/exceptions";
import { routes } from "@/lib/routes";
import type { ExceptionItem, ExceptionStatus, ExceptionType } from "@/lib/types";
import { resolveExceptionAction } from "@/app/app/actions";
import { ActionNotice } from "./demo-notice";

type Decision = "accepted" | "resolved" | "investigating";

interface Group {
  type: ExceptionType;
  items: ExceptionItem[];
  amount: number;
}

export function ExceptionInbox({
  runId,
  exceptions,
  status,
}: {
  runId: string;
  exceptions: ExceptionItem[];
  status: ExceptionStatus | "all";
}) {
  const router = useRouter();
  // Server data wins whenever it changes; local edits are only optimistic in between.
  const [items, setItems] = React.useState(exceptions);
  const [seen, setSeen] = React.useState(exceptions);
  if (seen !== exceptions) {
    setSeen(exceptions);
    setItems(exceptions);
  }

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [cursor, setCursor] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [notice, setNotice] = React.useState<{ status?: number; message: string } | null>(null);
  const [pending, startTransition] = React.useTransition();

  const groups = React.useMemo<Group[]>(() => {
    const by = new Map<ExceptionType, ExceptionItem[]>();
    for (const e of items) by.set(e.type, [...(by.get(e.type) ?? []), e]);
    return [...by.entries()]
      .map(([type, list]) => ({
        type,
        items: list,
        amount: list.reduce((s, e) => s + e.amount, 0),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [items]);

  const flat = React.useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const rowRefs = React.useRef<Map<string, HTMLTableRowElement>>(new Map());

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!flat.length) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, flat.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "x") {
        e.preventDefault();
        const id = flat[cursor]?.exc_id;
        if (id) toggle(id);
      } else if (e.key === "Enter") {
        const id = flat[cursor]?.exc_id;
        if (id) router.push(routes.exception(id));
      } else if (e.key === "Escape") {
        setSelected(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, cursor, router]);

  React.useEffect(() => {
    const id = flat[cursor]?.exc_id;
    if (id) rowRefs.current.get(id)?.scrollIntoView({ block: "nearest" });
  }, [cursor, flat]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function decide(ids: string[], decision: Decision, withNote?: string) {
    if (!ids.length) return;
    setNotice(null);
    const before = items;
    setItems((cur) =>
      cur.map((e) => (ids.includes(e.exc_id) ? { ...e, status: decision } : e)),
    );
    startTransition(async () => {
      let failed: { status?: number; message: string } | null = null;
      for (const id of ids) {
        const res = await resolveExceptionAction(runId, id, decision, withNote || undefined);
        if (!res.ok) {
          failed = { status: res.status, message: res.error };
          break;
        }
      }
      if (failed) {
        setItems(before);
        setNotice(failed);
      } else {
        setSelected(new Set());
        setNote("");
        router.refresh();
      }
    });
  }

  if (!items.length) {
    return (
      <EmptyState
        title={status === "open" ? "Nothing left to decide" : "No exceptions in this view"}
        body={
          status === "open"
            ? "Every rupee in this run is either matched or already decided. Change the status filter to see history."
            : "Try another status, type or family."
        }
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href={routes.exceptions}>Show open exceptions</Link>
          </Button>
        }
      />
    );
  }

  const allSelected = selected.size > 0 && selected.size === flat.length;

  return (
    <div className="relative">
      {notice && <ActionNotice status={notice.status} message={notice.message} className="mb-3" />}

      <div className="mb-2 flex items-center gap-3 text-[12px] text-faint">
        <span className="inline-flex items-center gap-1">
          <Kbd>j</Kbd>
          <Kbd>k</Kbd> move
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>x</Kbd> select
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>↵</Kbd> open
        </span>
        <button
          type="button"
          className="ml-auto hover:text-text"
          onClick={() =>
            setSelected(allSelected ? new Set() : new Set(flat.map((e) => e.exc_id)))
          }
        >
          {allSelected ? "Clear selection" : `Select all ${flat.length}`}
        </button>
      </div>

      <div className="space-y-6">
        {groups.map((g) => {
          const spec = specFor(g.type);
          const openIds = g.items.filter((e) => e.status === "open").map((e) => e.exc_id);
          return (
            <section key={g.type} className="rounded-lg bg-surface hairline shadow-1">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-semibold text-text">{spec.title}</h2>
                    <code className="text-[10.5px] text-faint">{g.type}</code>
                    <span className="mono rounded-full bg-raised px-1.5 text-[11px] leading-5 text-muted">
                      {g.items.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">{spec.meaning}</p>
                  <p className="mt-0.5 text-[12px] text-faint">
                    Suggested: <span className="text-muted">{spec.action}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Amount paise={g.amount} size="lg" tone={spec.auto ? "muted" : "open"} />
                  {spec.auto && openIds.length > 0 && (
                    <Button
                      size="sm"
                      variant="settled"
                      disabled={pending}
                      onClick={() => decide(openIds, "accepted", `auto-accept ${g.type}`)}
                    >
                      <CheckCheck /> Accept all {openIds.length}
                    </Button>
                  )}
                </div>
              </header>
              <table className="w-full text-[13px]">
                <tbody>
                  {g.items.map((e) => {
                    const idx = flat.indexOf(e);
                    const isCursor = idx === cursor;
                    const isSel = selected.has(e.exc_id);
                    return (
                      <tr
                        key={e.exc_id}
                        ref={(el) => {
                          if (el) rowRefs.current.set(e.exc_id, el);
                          else rowRefs.current.delete(e.exc_id);
                        }}
                        onClick={() => setCursor(idx)}
                        className={cn(
                          "border-b border-line last:border-0 transition-colors",
                          isCursor && "bg-raised/80",
                          isSel && "bg-signal-dim/40",
                        )}
                      >
                        <td className="w-9 pl-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${e.exc_id}`}
                            checked={isSel}
                            onChange={() => toggle(e.exc_id)}
                            className="size-3.5 accent-[var(--signal)]"
                          />
                        </td>
                        <td className="w-36 py-2 pr-3 text-right">
                          <Amount paise={e.amount} />
                        </td>
                        <td className="w-56 py-2 pr-3">
                          {e.entities[0] ? (
                            <span className="inline-flex items-center gap-1.5">
                              <EntityRef refId={e.entities[0]} />
                              {e.entities.length > 1 && (
                                <span className="text-[11px] text-faint">+{e.entities.length - 1}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="max-w-0 py-2 pr-3">
                          <Link
                            href={routes.exception(e.exc_id)}
                            className="block truncate text-muted hover:text-text"
                            title={e.reason_text}
                          >
                            {e.reason_text}
                          </Link>
                        </td>
                        <td className="w-28 py-2 pr-3">
                          <Confidence value={e.confidence} />
                        </td>
                        <td className="w-24 py-2 pr-3">
                          {e.candidate_link ? <TierBadge tier={e.candidate_link.tier} /> : null}
                        </td>
                        <td className="w-28 py-2 pr-3">
                          <ExceptionStatusPill status={e.status} />
                        </td>
                        <td className="w-8 pr-3">
                          <Link
                            href={routes.exception(e.exc_id)}
                            aria-label={`Open ${e.exc_id}`}
                            className="text-faint hover:text-text"
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-surface/95 p-3 shadow-3 hairline backdrop-blur-md"
        >
          <span className="text-[13px] font-medium">
            {selected.size} selected ·{" "}
            <Amount
              paise={flat.filter((e) => selected.has(e.exc_id)).reduce((s, e) => s + e.amount, 0)}
            />
          </span>
          <Textarea
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="Optional note for the audit trail"
            className="min-h-9 h-9 flex-1 resize-none py-2"
            rows={1}
          />
          <Button
            size="sm"
            variant="settled"
            disabled={pending}
            onClick={() => decide([...selected], "accepted", note)}
          >
            <CheckCheck /> Accept
          </Button>
          <Button size="sm" disabled={pending} onClick={() => decide([...selected], "resolved", note)}>
            Resolve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => decide([...selected], "investigating", note)}
          >
            <Search /> Mark investigating
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Clear selection"
            onClick={() => setSelected(new Set())}
          >
            <X />
          </Button>
        </motion.div>
      )}

      {status === "open" && items.some((e) => e.confidence < 0.92) && (
        <p className="mt-6 flex items-center gap-1.5 text-[12px] text-faint">
          <Sparkles className="size-3.5" />
          Low-confidence rows are what the close pack calls unexplained. Decide them first.
        </p>
      )}
    </div>
  );
}
