"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { RUN_COOKIE } from "@/lib/run";
import * as api from "@/lib/api";
import type { ExceptionItem, InvestigateResult, AskResult, Run, RerunResult } from "@/lib/types";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

function fail(err: unknown): ActionResult<never> {
  if (err instanceof api.ApiError) return { ok: false, error: err.message, status: err.status };
  return {
    ok: false,
    error: "The Barabar API is not reachable. Start it with `make api` to act on live data.",
    status: 0,
  };
}

export async function setActiveRun(runId: string): Promise<void> {
  const jar = await cookies();
  jar.set(RUN_COOKIE, runId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/app", "layout");
}

export async function resolveExceptionAction(
  runId: string,
  excId: string,
  status: "resolved" | "accepted" | "open" | "investigating",
  note?: string,
): Promise<ActionResult<ExceptionItem>> {
  try {
    const data = await api.resolveException(runId, excId, { status, note });
    revalidatePath("/app", "layout");
    return { ok: true, data };
  } catch (err) {
    return fail(err);
  }
}

export async function investigateAction(
  runId: string,
  excId: string,
): Promise<ActionResult<InvestigateResult>> {
  try {
    const data = await api.investigate(runId, excId);
    revalidatePath(`/app/exceptions/${excId}`);
    return { ok: true, data };
  } catch (err) {
    return fail(err);
  }
}

export async function askAction(runId: string, question: string): Promise<ActionResult<AskResult>> {
  try {
    return { ok: true, data: await api.ask(runId, question) };
  } catch (err) {
    return fail(err);
  }
}

export async function createRunAction(body: api.CreateRunBody): Promise<ActionResult<Run>> {
  try {
    const data = await api.createRun(body);
    await setActiveRun(data.run_id);
    return { ok: true, data };
  } catch (err) {
    return fail(err);
  }
}

export async function uploadRunAction(form: FormData): Promise<ActionResult<Run>> {
  try {
    const data = await api.createRunUpload(form);
    await setActiveRun(data.run_id);
    return { ok: true, data };
  } catch (err) {
    return fail(err);
  }
}

export async function rerunAction(runId: string): Promise<ActionResult<RerunResult>> {
  try {
    const data = await api.rerun(runId);
    revalidatePath("/app", "layout");
    return { ok: true, data };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteRunAction(runId: string): Promise<ActionResult<null>> {
  try {
    await api.deleteRun(runId);
    revalidatePath("/app", "layout");
    return { ok: true, data: null };
  } catch (err) {
    return fail(err);
  }
}
