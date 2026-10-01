"use server";

import { revalidatePath } from "next/cache";
import { getFlagSecret, recordFlagSubmission } from "@/db/queries/content";
import { MAX_FLAG_LENGTH, normalizeFlag, verifyFlag } from "@/lib/flag-hash";

export type FlagResult = {
  status: "idle" | "correct" | "incorrect" | "invalid";
  message: string;
};

/**
 * Checks a flag on the server. The expected answer never reaches the browser:
 * only "correct" or "incorrect" comes back. Every attempt is recorded; wrong
 * ones keep the typed value so they can be reviewed, correct ones do not.
 */
export async function submitFlag(_previous: FlagResult, formData: FormData): Promise<FlagResult> {
  const moduleSlug = formData.get("moduleSlug");
  const taskSlug = formData.get("taskSlug");
  const raw = formData.get("flag");
  if (typeof moduleSlug !== "string" || typeof taskSlug !== "string" || typeof raw !== "string") {
    return { status: "invalid", message: "Envio inválido." };
  }

  const value = normalizeFlag(raw);
  if (value.length === 0) return { status: "invalid", message: "Digite a flag antes de enviar." };
  if (value.length > MAX_FLAG_LENGTH) {
    return { status: "invalid", message: `A flag tem no máximo ${MAX_FLAG_LENGTH} caracteres.` };
  }

  const secret = getFlagSecret(moduleSlug, taskSlug);
  if (!secret) {
    return {
      status: "invalid",
      message: "Esta tarefa não está no banco. Rode npm run content:ingest.",
    };
  }

  const correct = verifyFlag(value, secret.answerHash, secret.salt);
  recordFlagSubmission(secret.flagId, value, correct);
  revalidatePath("/trilhas/[trackSlug]/[moduleSlug]", "page");

  return correct
    ? { status: "correct", message: "Flag correta! Missão concluída." }
    : {
        status: "incorrect",
        message: "Ainda não. Confira maiúsculas, as chaves { } e se copiou a linha inteira.",
      };
}
