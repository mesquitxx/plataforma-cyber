"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getFlagSecret } from "@/db/queries/content";
import {
  recordFlagAttempt,
  setManualTask,
  setModuleCompletion,
  submitQuizAttempt,
  type QuizGrade,
} from "@/db/queries/progress";
import { MAX_FLAG_LENGTH, normalizeFlag, verifyFlag } from "@/lib/flag-hash";

/**
 * Server Actions of the module page. Inputs are untrusted (any form can be
 * forged), so every one is validated here; Next.js also rejects actions whose
 * Origin does not match the Host, and proxy.ts only accepts the local Host.
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);

/** Progress shows on every page (home, tracks, dashboard): refresh them all. */
function refreshProgress() {
  revalidatePath("/", "layout");
}

// ---------- Flags ----------

export type FlagResult = {
  status: "idle" | "correct" | "incorrect" | "invalid";
  message: string;
};

/**
 * Checks a flag on the server. The expected answer never reaches the browser:
 * only "correct" or "incorrect" comes back. Every attempt is recorded; wrong
 * ones keep the typed value so they can be reviewed, correct ones do not.
 * A right flag completes its task (and the module, if it was the last one).
 */
export async function submitFlag(_previous: FlagResult, formData: FormData): Promise<FlagResult> {
  const moduleSlug = slug.safeParse(formData.get("moduleSlug"));
  const taskSlug = slug.safeParse(formData.get("taskSlug"));
  const raw = formData.get("flag");
  if (!moduleSlug.success || !taskSlug.success || typeof raw !== "string") {
    return { status: "invalid", message: "Envio inválido." };
  }

  const value = normalizeFlag(raw);
  if (value.length === 0) return { status: "invalid", message: "Digite a flag antes de enviar." };
  if (value.length > MAX_FLAG_LENGTH) {
    return { status: "invalid", message: `A flag tem no máximo ${MAX_FLAG_LENGTH} caracteres.` };
  }

  const secret = getFlagSecret(moduleSlug.data, taskSlug.data);
  if (!secret) {
    return {
      status: "invalid",
      message: "Esta tarefa não está no banco. Rode npm run content:ingest.",
    };
  }

  const correct = verifyFlag(value, secret.answerHash, secret.salt);
  recordFlagAttempt(secret.flagId, secret.taskId, secret.moduleId, value, correct);
  refreshProgress();

  return correct
    ? { status: "correct", message: "Flag correta! Missão concluída." }
    : {
        status: "incorrect",
        message: "Ainda não. Confira maiúsculas, as chaves { } e se copiou a linha inteira.",
      };
}

// ---------- Quizzes ----------

export type QuizResult =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | ({ status: "graded" } & QuizGrade);

/**
 * Grades a quiz on the server. The answer key and the explanations only come
 * back after the attempt is recorded. Form fields: moduleSlug, taskSlug and
 * q0..qN with the chosen option index.
 */
export async function submitQuiz(_previous: QuizResult, formData: FormData): Promise<QuizResult> {
  const moduleSlug = slug.safeParse(formData.get("moduleSlug"));
  const taskSlug = slug.safeParse(formData.get("taskSlug"));
  const total = z.coerce.number().int().min(1).max(100).safeParse(formData.get("total"));
  if (!moduleSlug.success || !taskSlug.success || !total.success) {
    return { status: "invalid", message: "Envio inválido." };
  }

  const answers: number[] = [];
  for (let i = 0; i < total.data; i++) {
    const answer = z.coerce.number().int().min(0).safeParse(formData.get(`q${i}`));
    if (!answer.success) return { status: "invalid", message: "Responda todas as perguntas antes de conferir." };
    answers.push(answer.data);
  }

  const grade = submitQuizAttempt(moduleSlug.data, taskSlug.data, answers);
  if (!grade) {
    return {
      status: "invalid",
      message: "Este quiz mudou ou não está no banco. Recarregue a página (ou rode npm run content:ingest).",
    };
  }
  refreshProgress();
  return { status: "graded", ...grade };
}

// ---------- Manual marks ----------

const taskToggle = z.object({ moduleSlug: slug, taskSlug: slug, done: z.boolean() });

/** Ticks or unticks a reading, exercise or lab step task. */
export async function toggleTask(input: z.input<typeof taskToggle>): Promise<{ ok: boolean }> {
  const parsed = taskToggle.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ok = setManualTask(parsed.data.moduleSlug, parsed.data.taskSlug, parsed.data.done);
  if (ok) refreshProgress();
  return { ok };
}

const moduleToggle = z.object({ moduleSlug: slug, completed: z.boolean() });

/** Completes or reopens a module that has no tasks. */
export async function toggleModuleCompleted(input: z.input<typeof moduleToggle>): Promise<{ ok: boolean }> {
  const parsed = moduleToggle.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ok = setModuleCompletion(parsed.data.moduleSlug, parsed.data.completed);
  if (ok) refreshProgress();
  return { ok };
}
