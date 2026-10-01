"use server";

import { z } from "zod";
import { AVAILABLE_LAB_SLUGS, getLab } from "@/lib/labs/catalog";
import { forgetKaliSession, openKaliDesktop } from "@/lib/labs/guacamole";
import { LAB_ACTIONS } from "@/lib/labs/jobs";
import { readLabsStatus, startLabJob } from "@/lib/labs/runner";

/**
 * Server Actions that control the labs (Phase 6). This is where the browser
 * reaches Docker, so (security trade-off T1 in docs/LABORATORIO.md):
 * - inputs are untrusted and must be one action of LAB_ACTIONS and one slug
 *   of an available lab: nothing else reaches scripts/lab.sh;
 * - Next.js rejects actions whose Origin does not match the Host, and
 *   proxy.ts only lets through the local Host and, on POST, the local Origin;
 * - there is no GET that changes anything (the status route only reads).
 */

const labInput = z.strictObject({
  action: z.enum(LAB_ACTIONS),
  lab: z.enum(AVAILABLE_LAB_SLUGS),
});

export type LabActionResult = { ok: true; jobId: number } | { ok: false; error: string };

export async function runLabAction(input: unknown): Promise<LabActionResult> {
  const parsed = labInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ação ou laboratório inválido." };

  const { action, lab } = parsed.data;
  // Guacamole sessions die with the containers: drop the cached token.
  if (action !== "verify" && action !== "up") forgetKaliSession();
  const result = startLabJob(action, lab);
  return result.ok ? { ok: true, jobId: result.job.id } : result;
}

export type DesktopResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * A URL for the embedded Kali desktop of a running desktop lab. It carries a
 * session token of the restricted Guacamole user "plataforma".
 */
export async function openDesktop(input: unknown): Promise<DesktopResult> {
  const parsed = z.strictObject({ lab: z.enum(AVAILABLE_LAB_SLUGS) }).safeParse(input);
  if (!parsed.success || getLab(parsed.data.lab)?.kind !== "desktop") {
    return { ok: false, error: "Este laboratório não tem desktop." };
  }
  try {
    const status = await readLabsStatus();
    if (status.states[parsed.data.lab] !== "running") {
      return { ok: false, error: "O laboratório não está rodando." };
    }
    return { ok: true, ...(await openKaliDesktop()) };
  } catch (error) {
    console.error("openDesktop:", error);
    return { ok: false, error: "Não foi possível abrir o desktop do Kali (veja o terminal do next)." };
  }
}
