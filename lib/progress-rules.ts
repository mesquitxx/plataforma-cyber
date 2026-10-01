/**
 * Pure progress rules (Phase 5), shared by the Server Actions and the tests.
 * Rules: docs/MODELO-DE-DADOS.md, "Decisões da Fase 5".
 *
 * - A graded task (flag, quiz) is completed by a right answer; a wrong one
 *   leaves it in progress, but never undoes a completion.
 * - A manual task (reading, exercise, lab_step) is ticked and unticked.
 * - A module is completed when all its tasks are; any action on a task
 *   starts it. Only unticking a task takes a completed module back.
 * - A module without tasks is completed and reopened by hand.
 */
import type { ProgressStatus } from "@/db/schema";

/** Right answers needed to pass, as a share: score/total >= passPercent%. */
export function quizPassed(score: number, total: number, passPercent: number): boolean {
  return total > 0 && score * 100 >= passPercent * total;
}

/** Minimum right answers to pass a quiz with `total` questions. */
export function quizPassMark(total: number, passPercent: number): number {
  return Math.ceil((passPercent * total) / 100);
}

/** New status of a flag or quiz task after an attempt. */
export function gradedTaskStatus(current: ProgressStatus | undefined, success: boolean): ProgressStatus {
  if (success || current === "completed") return "completed";
  return "in_progress";
}

/** New status of a manual task after the reader ticks or unticks it. */
export function manualTaskStatus(done: boolean): ProgressStatus {
  return done ? "completed" : "not_started";
}

/**
 * New module status after an action on one of its tasks. `taskStatuses`
 * already includes the change (one entry per task; missing = not_started).
 */
export function moduleStatusAfterTaskChange(
  current: ProgressStatus | undefined,
  taskStatuses: (ProgressStatus | undefined)[],
  undoing: boolean,
): ProgressStatus {
  if (taskStatuses.length > 0 && taskStatuses.every((s) => s === "completed")) return "completed";
  if (current === "completed" && !undoing) return "completed";
  return "in_progress";
}

/** Status set by the manual buttons of a module without tasks. */
export function manualModuleStatus(completed: boolean): ProgressStatus {
  return completed ? "completed" : "in_progress";
}

/** Grades a quiz: answers[i] is the chosen option of question i. */
export function gradeQuiz(answerKey: number[], answers: number[]) {
  const results = answerKey.map((answer, i) => answers[i] === answer);
  return { results, score: results.filter(Boolean).length, total: answerKey.length };
}
