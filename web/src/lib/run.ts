import "server-only";

import { cookies } from "next/headers";
import { defaultRunId, listRuns } from "./api";

export const RUN_COOKIE = "barabar_run";

/** The run the /app routes render: the cookie if it still exists, else the newest. */
export async function activeRunId(): Promise<string> {
  const jar = await cookies();
  const chosen = jar.get(RUN_COOKIE)?.value;
  if (chosen) {
    const runs = await listRuns();
    if (runs.some((r) => r.run_id === chosen)) return chosen;
  }
  return defaultRunId();
}
