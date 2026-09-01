"use client";

import * as React from "react";
import Link from "next/link";
import { CornerDownLeft, ShieldCheck, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityRef } from "@/components/domain/chips";
import { routes } from "@/lib/routes";
import type { AskResult } from "@/lib/types";
import { askAction } from "@/app/app/actions";
import { ActionNotice } from "@/components/exceptions/demo-notice";
import { SUGGESTIONS, suggestionFor, type AskContext } from "./local-answers";
import { Typewriter } from "@/components/motion/typewriter";

interface Turn {
  id: number;
  question: string;
  result?: AskResult;
  local?: boolean;
  error?: { status?: number; message: string };
}

function isRef(s: string): boolean {
  return /^(payment|refund|dispute|adjustment|settlement|recon_line|bank|ledger):[A-Za-z0-9_-]+$/.test(s);
}

export function AskClient({
  runId,
  ctx,
  live,
  initialQuestion,
}: {
  runId: string;
  ctx: AskContext;
  live: boolean;
  initialQuestion?: string;
}) {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [value, setValue] = React.useState("");
  const [pending, start] = React.useTransition();
  const seq = React.useRef(0);
  const ranInitial = React.useRef(false);
  const bottom = React.useRef<HTMLDivElement>(null);

  const ask = React.useCallback(
    (question: string) => {
      const q = question.trim();
      if (!q) return;
      const id = ++seq.current;
      setTurns((t) => [...t, { id, question: q }]);
      setValue("");
      const local = suggestionFor(q);
      if (!live && local) {
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, result: local.answer(ctx), local: true } : x)));
        return;
      }
      start(async () => {
        const res = await askAction(runId, q);
        setTurns((t) =>
          t.map((x) =>
            x.id === id
              ? res.ok
                ? { ...x, result: res.data }
                : local
                  ? { ...x, result: local.answer(ctx), local: true }
                  : { ...x, error: { status: res.status, message: res.error } }
              : x,
          ),
        );
      });
    },
    [ctx, live, runId],
  );

  React.useEffect(() => {
    if (initialQuestion && !ranInitial.current) {
      ranInitial.current = true;
      ask(initialQuestion);
    }
  }, [initialQuestion, ask]);

  React.useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(value);
        }}
        className="sticky top-16 z-10 flex items-center gap-2 rounded-xl bg-surface p-2 shadow-2 hairline"
      >
        <span className="hidden shrink-0 rounded-md bg-sunken px-2 py-1 text-[11.5px] text-muted sm:inline-flex">
          {ctx.runName}
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Why did ₹1,13,149.51 land on 5 Aug?"
          aria-label="Ask a question about this run"
          className="h-10 flex-1 bg-transparent px-2 text-[15px] text-text outline-none placeholder:text-faint"
        />
        <Button type="submit" variant="primary" size="sm" disabled={pending || !value.trim()}>
          Ask <CornerDownLeft />
        </Button>
      </form>

      {turns.length === 0 && (
        <div>
          <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Try one</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => ask(s.question)}
                className="rounded-full bg-surface px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-text hairline hover:bg-raised"
              >
                {s.question}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[12.5px] text-faint">
            Answers cite proof trees and exceptions. Every figure in an answer is checked against the run before it is shown;
            {live ? " a blocked answer means a number did not survive that check." : " without the API, the five questions above are answered from run data with no model involved."}
          </p>
        </div>
      )}

      <ol className="space-y-6">
        {turns.map((t) => (
          <li key={t.id} className="fade-up">
            <div className="mb-2 text-[15px] font-medium text-text">{t.question}</div>
            {t.error ? (
              <ActionNotice status={t.error.status} message={t.error.message} />
            ) : t.result ? (
              <Answer result={t.result} local={t.local} />
            ) : (
              <div className="flex items-center gap-2 text-[13px] text-muted">
                <span className="size-1.5 rounded-full bg-signal animate-[pulse-dot_1.2s_ease-in-out_infinite]" />
                Reading the run…
              </div>
            )}
          </li>
        ))}
      </ol>
      <div ref={bottom} />
    </div>
  );
}

function Answer({ result, local }: { result: AskResult; local?: boolean }) {
  return (
    <div className={cn("rounded-lg bg-surface p-4 hairline shadow-1", result.guard.blocked && "shadow-[inset_0_0_0_1px_var(--critical)]")}>
      <p className="text-[14px] leading-relaxed text-text">
        <Typewriter text={result.answer} cps={110} />
      </p>

      {(result.citations.length > 0 || result.settlement_ids.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {result.citations.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">Citations</div>
              <ul className="space-y-1.5">
                {result.citations.map((c, i) => (
                  <li key={i} style={{ "--i": i + 8 } as React.CSSProperties} className="cascade text-[12.5px]">
                    {isRef(c.ref) ? <EntityRef refId={c.ref} /> : <code className="text-[12px] text-text">{c.ref}</code>}
                    <span className="block text-muted">{c.summary}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.settlement_ids.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">Proof trees</div>
              <ul className="space-y-1">
                {result.settlement_ids.map((id) => (
                  <li key={id}>
                    <Link href={routes.settlement(id)} className="mono text-[12.5px] text-signal-fg underline-offset-4 hover:underline">
                      {id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[12px] text-muted">
        {result.guard.blocked ? (
          <Badge tone="critical">
            <ShieldOff className="size-3" /> blocked by the number guard
          </Badge>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-settled" />
            {result.guard.numbers_checked} figures checked against the run
          </span>
        )}
        {local && <Badge tone="outline">answered from run data, no model involved</Badge>}
      </div>
    </div>
  );
}
