/**
 * Lab status for the interface to poll (Phase 6). Read-only: it never starts
 * anything and carries no secret (no Guacamole token, no password). Same-origin
 * only in practice: proxy.ts rejects foreign Hosts, and without CORS headers
 * another site cannot read the response.
 */
import { NextResponse } from "next/server";
import { exitMessage, type JobView, type LabsStatusResponse } from "@/lib/labs/jobs";
import { getLabJobs, readLabsStatus } from "@/lib/labs/runner";
import type { LabsStatus } from "@/lib/labs/status";

export async function GET() {
  const { current, last } = getLabJobs();
  const view = (job: typeof current): JobView | null =>
    job && { ...job, output: [...job.output], message: exitMessage(job) };

  let status: LabsStatus | null = null;
  let error: string | null = null;
  try {
    status = await readLabsStatus();
  } catch (e) {
    console.error(e);
    error = "Não foi possível ler o Docker. Ele está rodando no WSL?";
  }

  const body: LabsStatusResponse = { status, error, current: view(current), last: view(last) };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
