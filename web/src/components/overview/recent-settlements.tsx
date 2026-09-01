import Link from "next/link";
import { Amount } from "@/components/domain/amount";
import { MatchStatusPill } from "@/components/domain/chips";
import { Table, THead, TBody, Tr, Th, Td, TdNum } from "@/components/ui/table";
import { fmtDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { ClosePackSettlement } from "@/lib/types";

export function RecentSettlements({ settlements }: { settlements: ClosePackSettlement[] }) {
  const rows = [...settlements]
    .sort((a, b) => (a.settled_on < b.settled_on ? 1 : a.settled_on > b.settled_on ? -1 : 0))
    .slice(0, 8);

  return (
    <Table>
      <THead>
        <tr>
          <Th>Settled</Th>
          <Th>Settlement</Th>
          <Th>UTR</Th>
          <Th className="text-right">Net</Th>
          <Th>Bank</Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((s) => (
          <Tr key={s.settlement_id}>
            <Td className="text-muted">{fmtDate(s.settled_on)}</Td>
            <Td>
              <Link
                href={routes.settlement(s.settlement_id)}
                className="mono text-[12.5px] text-text underline decoration-line underline-offset-[3px] hover:text-signal-fg hover:decoration-signal"
              >
                {s.settlement_id}
              </Link>
            </Td>
            <Td className="mono text-[12px] text-muted">{s.utr ?? <span className="text-faint">—</span>}</Td>
            <TdNum>
              <Amount paise={s.amount} />
            </TdNum>
            <Td>
              <MatchStatusPill status={s.match_status} />
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
