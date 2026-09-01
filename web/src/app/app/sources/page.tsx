import { source } from "@/lib/api";
import { PageHeader } from "@/components/shell/page-header";
import { SourcesClient } from "@/components/sources/sources-client";

export const metadata = { title: "Sources" };

export default async function SourcesPage() {
  const src = await source();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Sources"
        title="Three legs, one month"
        description="Razorpay says what it settled, the bank says what landed, the ledger says what you sold. Barabar reconciles all three to the paise and explains the rest."
      />
      <SourcesClient live={src === "live"} />
    </div>
  );
}
