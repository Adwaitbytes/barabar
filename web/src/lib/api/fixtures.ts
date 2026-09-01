import "server-only";

import closePack from "@/lib/fixtures/close-pack.json";
import exceptions from "@/lib/fixtures/exceptions.json";
import runs from "@/lib/fixtures/runs.json";
import proofs from "@/lib/fixtures/proofs.json";
import audit from "@/lib/fixtures/audit.json";
import links from "@/lib/fixtures/links.json";
import payments from "@/lib/fixtures/month-payments.json";
import refunds from "@/lib/fixtures/month-refunds.json";
import disputes from "@/lib/fixtures/month-disputes.json";
import adjustments from "@/lib/fixtures/month-adjustments.json";
import settlements from "@/lib/fixtures/month-settlements.json";
import reconLines from "@/lib/fixtures/month-recon_lines.json";
import bankTxns from "@/lib/fixtures/month-bank_txns.json";
import ledger from "@/lib/fixtures/month-ledger.json";

import type {
  AuditTrail,
  ClosePack,
  ExceptionItem,
  MatchLink,
  MonthKind,
  MonthKindMap,
  ProofNode,
  Run,
} from "@/lib/types";

/**
 * A real month captured from the FastAPI service (synthetic d2c_fashion, seed 42,
 * 600 orders). Used when the API is unreachable so every screen renders the same
 * numbers a live run would.
 */
export const FIXTURE_RUN_ID = (closePack as unknown as ClosePack).run.run_id;

export const fixtures = {
  runs: runs as unknown as Run[],
  closePack: closePack as unknown as ClosePack,
  exceptions: exceptions as unknown as ExceptionItem[],
  proofs: proofs as unknown as Record<string, ProofNode>,
  audit: audit as unknown as AuditTrail,
  links: links as unknown as MatchLink[],
  month: {
    payments,
    refunds,
    disputes,
    adjustments,
    settlements,
    recon_lines: reconLines,
    bank_txns: bankTxns,
    ledger,
  } as unknown as { [K in MonthKind]: MonthKindMap[K][] },
};
