import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { activeRunId } from "@/lib/run";
import { getException, listExceptions } from "@/lib/api";
import { specFor, FAMILY_LABEL } from "@/lib/exceptions";
import { routes } from "@/lib/routes";
import { Amount } from "@/components/domain/amount";
import { Confidence, EntityRef, ExceptionStatusPill, RuleId } from "@/components/domain/chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { DETECTION } from "@/components/exceptions/detection";
import { CandidateCard, DecidePanel } from "@/components/exceptions/decide-panel";

export async function generateMetadata({ params }: PageProps<"/app/exceptions/[id]">) {
  const { id } = await params;
  return { title: `Exception ${id}` };
}

export default async function ExceptionDetailPage({ params }: PageProps<"/app/exceptions/[id]">) {
  const { id } = await params;
  const runId = await activeRunId();
  const exc = await getException(runId, id);
  if (!exc) notFound();

  const siblings = await listExceptions(runId, { type: exc.type });
  const idx = siblings.findIndex((e) => e.exc_id === exc.exc_id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const spec = specFor(exc.type);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={`${routes.exceptions}?type=${exc.type}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-text"
        >
          <ArrowLeft className="size-3.5" /> {spec.title} · {siblings.length} in this run
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            {prev ? (
              <Link href={routes.exception(prev.exc_id)} aria-label="Previous exception">
                <ChevronLeft /> Prev
              </Link>
            ) : (
              <span className="opacity-40">
                <ChevronLeft /> Prev
              </span>
            )}
          </Button>
          <span className="mono text-[12px] text-faint">
            {idx + 1} / {siblings.length}
          </span>
          <Button asChild variant="ghost" size="sm">
            {next ? (
              <Link href={routes.exception(next.exc_id)} aria-label="Next exception">
                Next <ChevronRight />
              </Link>
            ) : (
              <span className="opacity-40">
                Next <ChevronRight />
              </span>
            )}
          </Button>
        </div>
      </div>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-faint">
            {FAMILY_LABEL[spec.family]} <span className="text-line-strong">/</span>
            <code className="normal-case tracking-normal">{exc.type}</code>
          </div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{spec.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ExceptionStatusPill status={exc.status} />
            <Confidence value={exc.confidence} />
            {spec.auto && <Badge tone="settled">auto-resolvable</Badge>}
            {exc.secondary_tags.map((t) => (
              <Badge key={t} tone="outline">
                {t}
              </Badge>
            ))}
            <code className="text-[11.5px] text-faint">{exc.exc_id}</code>
          </div>
        </div>
        <Amount paise={exc.amount} size="display" tone={exc.status === "open" ? "open" : "default"} />
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <section>
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Why it was raised</h2>
          <dl className="space-y-4 text-[13px]">
            <div>
              <dt className="text-faint">Reason</dt>
              <dd className="mt-0.5 text-text">{exc.reason_text}</dd>
              <dd className="mt-1">
                <RuleId id={exc.reason_code} />
                {exc.subtype && <code className="ml-2 text-[11px] text-faint">{exc.subtype}</code>}
              </dd>
            </div>
            <div>
              <dt className="text-faint">What this type means</dt>
              <dd className="mt-0.5 text-text">{spec.meaning}</dd>
            </div>
            <div>
              <dt className="text-faint">Detection rule</dt>
              <dd className="mt-1">
                <Hint label="From docs/EXCEPTIONS.md, rendered from the same enum the matcher uses.">
                  <code className="block rounded-md bg-sunken px-2.5 py-2 text-[12px] text-muted hairline">
                    {DETECTION[exc.type]}
                  </code>
                </Hint>
              </dd>
            </div>
            <div>
              <dt className="text-faint">Suggested action</dt>
              <dd className="mt-0.5 text-text">{exc.suggested_action}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Evidence</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[12.5px] text-faint">
                {exc.entities.length} {exc.entities.length === 1 ? "entity" : "entities"}
              </div>
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md bg-sunken p-2 scrollbar-thin hairline">
                {exc.entities.map((ref) => (
                  <li key={ref}>
                    <EntityRef refId={ref} />
                  </li>
                ))}
              </ul>
            </div>
            {exc.candidate_link && <CandidateCard runId={runId} exc={exc} link={exc.candidate_link} />}
            {exc.evidence.length > 0 ? (
              <ul className="space-y-2">
                {exc.evidence.map((ev, i) => (
                  <li key={i} className="rounded-md bg-raised p-3 text-[12.5px] hairline">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{ev.kind}</Badge>
                      <code className="truncate text-[12px] text-muted">{ev.ref}</code>
                    </div>
                    <p className="mt-1 text-text">{ev.summary}</p>
                    {ev.result_hash && (
                      <code className="mt-1 block text-[11px] text-faint">hash {ev.result_hash.slice(0, 16)}</code>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-faint">
                No tool evidence yet. The rule above is the evidence; the agent can add more.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Decide</h2>
          <DecidePanel runId={runId} exc={exc} />
        </section>
      </div>
    </div>
  );
}
