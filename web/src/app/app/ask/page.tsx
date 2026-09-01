import { activeRunId } from "@/lib/run";
import { getClosePack, listExceptions, source } from "@/lib/api";
import { PageHeader } from "@/components/shell/page-header";
import { AskClient } from "@/components/ask/ask-client";
import type { AskContext } from "@/components/ask/local-answers";

export const metadata = { title: "Ask the books" };

export default async function AskPage({ searchParams }: PageProps<"/app/ask">) {
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const runId = await activeRunId();
  const [pack, exceptions, src] = await Promise.all([
    getClosePack(runId),
    listExceptions(runId, { status: "open" }),
    source(),
  ]);

  const ctx: AskContext = {
    runName: pack.run.name,
    asOf: pack.run.as_of,
    settlements: pack.settlements,
    openExceptions: exceptions.map(({ exc_id, type, amount, reason_text, entities, confidence }) => ({
      exc_id,
      type,
      amount,
      reason_text,
      entities,
      confidence,
    })),
    facts: pack.facts,
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Ask the books"
        title="Questions answered with proof, not prose"
        description="Scoped to this run. Answers resolve to settlements, exceptions and rule IDs you can open."
      />
      <AskClient runId={runId} ctx={ctx} live={src === "live"} initialQuestion={q} />
    </div>
  );
}
