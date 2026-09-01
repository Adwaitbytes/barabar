import { activeRunId } from "@/lib/run";
import { exportUrl, getMonth, listLinks, source } from "@/lib/api";
import { PageHeader } from "@/components/shell/page-header";
import { JournalClient } from "@/components/journal/journal-client";

export const metadata = { title: "Journal entries" };

export default async function JournalPage() {
  const runId = await activeRunId();
  const [settlements, reconLines, links, src] = await Promise.all([
    getMonth(runId, "settlements"),
    getMonth(runId, "recon_lines"),
    listLinks(runId),
    source(),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Journal entries"
        title="One balanced voucher per settlement"
        description="Drafted from the run, ready for Tally. Bank in, fees and GST out, sales returns and chargebacks netted, rounding kept honest."
      />
      <JournalClient
        settlements={settlements}
        reconLines={reconLines}
        links={links}
        live={src === "live"}
        exports={{
          journal: exportUrl(runId, "journal.csv"),
          tally: exportUrl(runId, "tally.xml"),
          exceptions: exportUrl(runId, "exceptions.csv"),
          memo: exportUrl(runId, "memo.md"),
        }}
      />
    </div>
  );
}
