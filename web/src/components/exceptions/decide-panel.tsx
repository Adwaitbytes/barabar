"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, RotateCcw, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Amount } from "@/components/domain/amount";
import { Confidence, EntityRef, ExceptionTypeChip, RuleId, TierBadge } from "@/components/domain/chips";
import { fmtDateTime } from "@/lib/format";
import type { ExceptionItem, InvestigateResult, MatchLink } from "@/lib/types";
import { investigateAction, resolveExceptionAction } from "@/app/app/actions";
import { ActionNotice } from "./demo-notice";

type Decision = "resolved" | "accepted" | "investigating" | "open";

function isRef(s: string): boolean {
  return /^[a-z_]+:[A-Za-z0-9_-]+$/.test(s);
}

export function CandidateCard({ runId, exc, link }: { runId: string; exc: ExceptionItem; link: MatchLink }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [notice, setNotice] = React.useState<{ status?: number; message: string } | null>(null);

  function act(decision: Decision, note: string) {
    setNotice(null);
    start(async () => {
      const res = await resolveExceptionAction(runId, exc.exc_id, decision, note);
      if (!res.ok) setNotice({ status: res.status, message: res.error });
      else router.refresh();
    });
  }

  return (
    <div className="rounded-lg bg-raised p-4 hairline">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Candidate link</span>
        <TierBadge tier={link.tier} />
      </div>
      <div className="flex flex-col gap-1.5 text-[13px]">
        <EntityRef refId={link.from_entity} />
        <span className="pl-1 text-faint">↓ {link.rule_id}</span>
        <EntityRef refId={link.to_entity} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
        <dt className="text-faint">Rule</dt>
        <dd>
          <RuleId id={link.rule_id} />
        </dd>
        <dt className="text-faint">Confidence</dt>
        <dd>
          <Confidence value={link.confidence} />
        </dd>
        <dt className="text-faint">Amount matched</dt>
        <dd>
          <Amount paise={link.amount_matched} />
        </dd>
        <dt className="text-faint">Residual</dt>
        <dd>
          <Amount paise={link.residual} tone={link.residual === 0 ? "settled" : "critical"} />
        </dd>
      </dl>
      {exc.status === "open" && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="settled" disabled={pending} onClick={() => act("accepted", "candidate accepted")}>
            <Check /> Accept candidate
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("open", "candidate rejected")}>
            Reject
          </Button>
        </div>
      )}
      {notice && <ActionNotice status={notice.status} message={notice.message} className="mt-3" />}
    </div>
  );
}

export function DecidePanel({ runId, exc }: { runId: string; exc: ExceptionItem }) {
  const router = useRouter();
  const [note, setNote] = React.useState("");
  const [pending, start] = React.useTransition();
  const [agentPending, startAgent] = React.useTransition();
  const [notice, setNotice] = React.useState<{ status?: number; message: string } | null>(null);
  const [agentNotice, setAgentNotice] = React.useState<{ status?: number; message: string } | null>(null);
  const [hypothesis, setHypothesis] = React.useState<InvestigateResult | null>(null);

  function decide(decision: Decision) {
    setNotice(null);
    start(async () => {
      const res = await resolveExceptionAction(runId, exc.exc_id, decision, note || undefined);
      if (!res.ok) setNotice({ status: res.status, message: res.error });
      else {
        setNote("");
        router.refresh();
      }
    });
  }

  function investigate() {
    setAgentNotice(null);
    startAgent(async () => {
      const res = await investigateAction(runId, exc.exc_id);
      if (!res.ok) setAgentNotice({ status: res.status, message: res.error });
      else {
        setHypothesis(res.data);
        router.refresh();
      }
    });
  }

  const decided = exc.status !== "open" && exc.status !== "investigating";

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="note" className="mb-1.5 block text-[12px] font-medium text-muted">
          Note for the audit trail
        </label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why this decision holds. Optional, but the chain keeps it forever."
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {!decided ? (
          <>
            <Button variant="settled" disabled={pending} onClick={() => decide("resolved")}>
              <CheckCheck /> Resolve
            </Button>
            <Button disabled={pending} onClick={() => decide("accepted")}>
              <Check /> Accept
            </Button>
            {exc.status !== "investigating" && (
              <Button variant="ghost" disabled={pending} onClick={() => decide("investigating")}>
                <Search /> Investigating
              </Button>
            )}
          </>
        ) : (
          <Button variant="secondary" disabled={pending} onClick={() => decide("open")}>
            <RotateCcw /> Reopen
          </Button>
        )}
      </div>
      {notice && <ActionNotice status={notice.status} message={notice.message} />}

      {(exc.resolved_by || exc.resolved_at || exc.resolution_note) && (
        <div className="rounded-md bg-raised px-3 py-2.5 text-[12.5px] hairline">
          <div className="text-faint">
            {exc.resolved_by ?? "—"} · {fmtDateTime(exc.resolved_at)}
          </div>
          {exc.resolution_note && <p className="mt-1 text-text">{exc.resolution_note}</p>}
        </div>
      )}

      <div className="border-t border-line pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Agent</span>
          <Badge tone="outline">tail only</Badge>
        </div>
        <p className="mb-3 text-[12.5px] text-muted">
          The agent proposes a type and evidence. It never changes a number; a person still decides.
        </p>
        <Button variant="signal" size="sm" disabled={agentPending} onClick={investigate}>
          <Sparkles /> {agentPending ? "Investigating…" : "Ask Barabar to investigate"}
        </Button>
        {agentNotice && <ActionNotice status={agentNotice.status} message={agentNotice.message} className="mt-3" />}
        {hypothesis && <HypothesisCard result={hypothesis} />}
      </div>
    </div>
  );
}

function HypothesisCard({ result }: { result: InvestigateResult }) {
  const h = result.hypothesis;
  return (
    <div className="mt-4 space-y-3 rounded-lg bg-signal-dim/40 p-4 hairline fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <ExceptionTypeChip type={h.type_proposed} />
        <Confidence value={h.confidence} />
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-faint">
          <code>{result.model}</code>
          {result.cached && <Badge tone="neutral">cached</Badge>}
        </span>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Suggested action</div>
        <p className="text-[13px] text-text">{h.suggested_action}</p>
      </div>
      {h.evidence.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-faint">Evidence</div>
          <ul className="space-y-1.5">
            {h.evidence.map((ev, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px]">
                <Badge tone="neutral">{ev.kind}</Badge>
                <span className="min-w-0">
                  {isRef(ev.ref) ? <EntityRef refId={ev.ref} /> : <code className="text-[12px]">{ev.ref}</code>}
                  <span className="block text-muted">{ev.summary}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Draft note</div>
        <p className="whitespace-pre-wrap text-[13px] text-text">{h.draft_note}</p>
      </div>
      {h.alternative_rejected && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-faint">Alternative rejected</div>
          <p className="text-[12.5px] text-muted">{h.alternative_rejected}</p>
        </div>
      )}
    </div>
  );
}
