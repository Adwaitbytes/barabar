import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/domain/amount";
import { Table, THead, TBody, Tr, Th, Td, TdNum } from "@/components/ui/table";
import { EmptyState } from "@/components/shell/page-header";
import { FAMILY_LABEL, specFor, type ExceptionFamily } from "@/lib/exceptions";
import { routes } from "@/lib/routes";
import { fmtInt } from "@/lib/format";
import type { ClosePack, ExceptionType } from "@/lib/types";

const FAMILY_DOT: Record<ExceptionFamily, string> = {
  timing: "bg-signal",
  pricing: "bg-open",
  refund: "bg-open",
  dispute: "bg-critical",
  bank: "bg-critical",
  ledger: "bg-faint",
  razorpay: "bg-signal",
};

export function NeedsHuman({ byType }: { byType: ClosePack["exceptions_by_type"] }) {
  const rows = (Object.entries(byType) as [ExceptionType, { count: number; amount: number }][])
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => b[1].amount - a[1].amount);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing needs a human"
        body="Every open item was resolved by rule. Sign the pack."
      />
    );
  }

  return (
    <Table>
      <THead>
        <tr>
          <Th>Exception</Th>
          <Th className="text-right">Count</Th>
          <Th className="text-right">Amount</Th>
          <Th />
        </tr>
      </THead>
      <TBody>
        {rows.map(([type, v], i) => {
          const spec = specFor(type);
          const href = `${routes.exceptions}?type=${type}`;
          return (
            <Tr key={type} className="group cascade accent-open" style={{ "--i": i } as React.CSSProperties}>
              <Td className="w-full whitespace-normal">
                <Link href={href} className="flex items-center gap-2.5 outline-none">
                  <span className={cn("size-2 shrink-0 rounded-full", FAMILY_DOT[spec.family])} />
                  <span className="font-medium text-text">{spec.title}</span>
                  <span className="text-[11px] text-faint">{FAMILY_LABEL[spec.family]}</span>
                </Link>
              </Td>
              <TdNum className="w-px text-muted">{fmtInt(v.count)}</TdNum>
              <TdNum className="w-px">
                <Amount paise={v.amount} />
              </TdNum>
              <Td className="w-8 pr-2 text-right">
                <Link href={href} aria-label={`Open ${spec.title} exceptions`} className="inline-flex text-faint group-hover:text-signal-fg">
                  <ArrowUpRight className="size-4" />
                </Link>
              </Td>
            </Tr>
          );
        })}
      </TBody>
    </Table>
  );
}
