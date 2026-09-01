import "server-only";

import { fixtures, FIXTURE_RUN_ID } from "./fixtures";
import type {
  AskResult,
  AuditTrail,
  ClosePack,
  ExceptionItem,
  ExceptionStatus,
  InvestigateResult,
  MatchLink,
  MonthKind,
  MonthKindMap,
  ProofNode,
  RerunResult,
  Run,
} from "@/lib/types";

/**
 * Data access for server components and server actions.
 *
 * Every read tries the FastAPI service first and falls back to the captured
 * fixtures, so the product demos identically with or without a backend.
 * `source()` tells the UI which one it is looking at.
 */

const API_URL =
  process.env.BARABAR_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 2500;

export type DataSource = "live" | "demo";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = TIMEOUT_MS,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = (await res.json()) as { detail?: string };
        if (body.detail) detail = body.detail;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(res.status, detail);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** True only for network-level failures; HTTP errors propagate. */
function isUnreachable(err: unknown): boolean {
  return !(err instanceof ApiError);
}

async function withFallback<T>(live: () => Promise<T>, demo: () => T): Promise<T> {
  try {
    return await live();
  } catch (err) {
    if (isUnreachable(err)) return demo();
    throw err;
  }
}

export async function source(): Promise<DataSource> {
  try {
    await request<{ status: string }>("/health");
    return "live";
  } catch {
    return "demo";
  }
}

export async function listRuns(): Promise<Run[]> {
  return withFallback(
    () => request<Run[]>("/runs"),
    () => fixtures.runs,
  );
}

/** The run every /app route renders when none is chosen: newest finished run. */
export async function defaultRunId(): Promise<string> {
  const runs = await listRuns();
  const finished = runs.filter((r) => r.stage === "finished");
  return (finished[0] ?? runs[0])?.run_id ?? FIXTURE_RUN_ID;
}

export async function getRun(runId: string): Promise<Run> {
  return withFallback(
    () => request<Run>(`/runs/${runId}`),
    () => fixtures.closePack.run,
  );
}

export async function getClosePack(runId: string): Promise<ClosePack> {
  return withFallback(
    () => request<ClosePack>(`/runs/${runId}/close-pack`),
    () => fixtures.closePack,
  );
}

export async function listExceptions(
  runId: string,
  filter?: { status?: ExceptionStatus; type?: string },
): Promise<ExceptionItem[]> {
  const qs = new URLSearchParams();
  if (filter?.status) qs.set("status", filter.status);
  if (filter?.type) qs.set("type", filter.type);
  const q = qs.size ? `?${qs}` : "";
  return withFallback(
    () => request<ExceptionItem[]>(`/runs/${runId}/exceptions${q}`),
    () =>
      fixtures.exceptions.filter(
        (e) =>
          (!filter?.status || e.status === filter.status) &&
          (!filter?.type || e.type === filter.type),
      ),
  );
}

export async function getException(runId: string, excId: string): Promise<ExceptionItem | null> {
  try {
    return await request<ExceptionItem>(`/runs/${runId}/exceptions/${excId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    if (!isUnreachable(err)) throw err;
    return fixtures.exceptions.find((e) => e.exc_id === excId) ?? null;
  }
}

export async function getProof(runId: string, settlementId: string): Promise<ProofNode | null> {
  try {
    return await request<ProofNode>(`/runs/${runId}/proof/${settlementId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    if (!isUnreachable(err)) throw err;
    return fixtures.proofs[settlementId] ?? null;
  }
}

export async function getProofByBank(runId: string, bankTxnId: string): Promise<ProofNode | null> {
  try {
    return await request<ProofNode>(`/runs/${runId}/proof-by-bank/${bankTxnId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    if (!isUnreachable(err)) throw err;
    const link = fixtures.links.find(
      (l) => l.from_entity === `bank:${bankTxnId}` && l.to_entity.startsWith("settlement:"),
    );
    if (!link) return null;
    return fixtures.proofs[link.to_entity.split(":")[1]] ?? null;
  }
}

export async function listLinks(runId: string, entity?: string): Promise<MatchLink[]> {
  const q = entity ? `?entity=${encodeURIComponent(entity)}` : "";
  return withFallback(
    () => request<MatchLink[]>(`/runs/${runId}/links${q}`),
    () =>
      fixtures.links.filter((l) => !entity || l.from_entity === entity || l.to_entity === entity),
  );
}

export async function getAudit(runId: string): Promise<AuditTrail> {
  return withFallback(
    () => request<AuditTrail>(`/runs/${runId}/audit`),
    () => fixtures.audit,
  );
}

export async function getMonth<K extends MonthKind>(
  runId: string,
  kind: K,
): Promise<MonthKindMap[K][]> {
  return withFallback(
    () => request<MonthKindMap[K][]>(`/runs/${runId}/month?kind=${kind}`),
    () => fixtures.month[kind],
  );
}

export function exportUrl(
  runId: string,
  file: "journal.csv" | "tally.xml" | "memo.md" | "exceptions.csv",
): string {
  return `${API_URL}/runs/${runId}/export/${file}`;
}

// --- mutations ----------------------------------------------------------------

export interface CreateRunBody {
  source: "synthetic" | "dataset";
  n_orders?: number;
  seed?: number;
  profile?: string;
  dataset_path?: string;
  name?: string;
}

export async function createRun(body: CreateRunBody): Promise<Run> {
  return request<Run>("/runs", { method: "POST", body: JSON.stringify(body) }, 60_000);
}

export async function createRunUpload(form: FormData): Promise<Run> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(`${API_URL}/runs/upload`, {
      method: "POST",
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new ApiError(res.status, body.detail ?? res.statusText);
    }
    return (await res.json()) as Run;
  } finally {
    clearTimeout(timer);
  }
}

export async function rerun(runId: string): Promise<RerunResult> {
  return request<RerunResult>(`/runs/${runId}/rerun`, { method: "POST" }, 60_000);
}

export async function deleteRun(runId: string): Promise<void> {
  await request<void>(`/runs/${runId}`, { method: "DELETE" });
}

export async function resolveException(
  runId: string,
  excId: string,
  body: { status: "resolved" | "accepted" | "open" | "investigating"; note?: string; actor?: string },
): Promise<ExceptionItem> {
  return request<ExceptionItem>(`/runs/${runId}/exceptions/${excId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ actor: "user:web", ...body }),
  });
}

export async function investigate(runId: string, excId: string): Promise<InvestigateResult> {
  return request<InvestigateResult>(
    `/runs/${runId}/exceptions/${excId}/investigate`,
    { method: "POST" },
    90_000,
  );
}

export async function getHypothesis(runId: string, excId: string): Promise<InvestigateResult | null> {
  try {
    return await request<InvestigateResult>(`/runs/${runId}/exceptions/${excId}/hypothesis`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    if (isUnreachable(err)) return null;
    throw err;
  }
}

export async function ask(runId: string, question: string): Promise<AskResult> {
  return request<AskResult>(
    `/runs/${runId}/ask`,
    { method: "POST", body: JSON.stringify({ question }) },
    90_000,
  );
}
