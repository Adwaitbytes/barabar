import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { activeRunId } from "@/lib/run";
import { getAudit, listRuns } from "@/lib/api";
import { routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { RunsTable } from "@/components/runs/runs-table";
import { AuditTrailView } from "@/components/runs/audit-trail";

export const metadata: Metadata = { title: "Runs & audit" };

export default async function RunsPage() {
  const runId = await activeRunId();
  const [runs, trail] = await Promise.all([listRuns(), getAudit(runId)]);
  const active = runs.find((r) => r.run_id === runId);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow="Runs & audit"
        title="Every run, every decision, hash-chained"
        description="A run is inputs + config + code. Re-running the same three yields the same outputs hash; every link and exception is an event on a chain you can verify."
        actions={
          <Button asChild variant="primary" size="sm">
            <Link href={routes.sources}>
              <Plus />
              New run
            </Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Runs</CardTitle>
        </CardHeader>
        <CardBody className="px-2 pb-2">
          {runs.length === 0 ? (
            <EmptyState
              title="No runs yet"
              body="Bring in a Razorpay export, a bank statement and a ledger, or generate a synthetic month."
              action={
                <Button asChild size="sm" variant="primary">
                  <Link href={routes.sources}>Go to sources</Link>
                </Button>
              }
            />
          ) : (
            <RunsTable runs={runs} activeId={runId} />
          )}
        </CardBody>
      </Card>

      <section aria-labelledby="audit">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="audit" className="text-[13px] font-medium text-muted">
            Audit trail · {active?.name ?? runId}
          </h2>
        </div>
        {trail.events.length === 0 ? (
          <EmptyState title="No events" body="This run has not produced any audit events." />
        ) : (
          <AuditTrailView trail={trail} />
        )}
      </section>
    </div>
  );
}
