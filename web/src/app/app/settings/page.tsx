import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { activeRunId } from "@/lib/run";
import { getRun } from "@/lib/api";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { KnobGroups, RateCardView, CalendarView } from "@/components/settings/knobs";

export const metadata: Metadata = { title: "Rate card & rules" };

export default async function SettingsPage() {
  const runId = await activeRunId();
  const run = await getRun(runId);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow="Rate card & rules"
        title="Every knob is part of the run"
        description="Change a tolerance and it is a different run with a different config hash. These are the defaults the active run was reconciled with; editing lands in a later release."
        actions={
          <Badge tone="outline" className="h-6 gap-1.5 px-2.5">
            <Lock className="size-3" />
            read-only
          </Badge>
        }
      />

      <div className="space-y-6">
        <KnobGroups configHash={run.config_hash} />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <RateCardView configHash={run.config_hash} />
          <CalendarView configHash={run.config_hash} asOf={run.as_of} />
        </div>
      </div>
    </div>
  );
}
