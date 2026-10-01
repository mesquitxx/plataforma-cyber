/**
 * Dashboard figures (Phase 5), computed from raw state rows. Pure functions,
 * tested with npm test; db/queries/dashboard.ts feeds them.
 */
import { quizPassed } from "./progress-rules";

export type ActivityKind = "flag_correct" | "flag_wrong" | "quiz" | "task_done" | "module_done";

export type ActivityEvent = {
  kind: ActivityKind;
  at: Date;
  title: string;
  /** e.g. "8/10" for a quiz; null otherwise. */
  detail: string | null;
  /** Module number and title, e.g. "0.3 Linux: primeiros passos no terminal". */
  module: string;
  href: string;
};

/** Most recent first; ties keep their input order. */
export function recentActivity(events: ActivityEvent[], limit = 15): ActivityEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => b.event.at.getTime() - a.event.at.getTime() || a.index - b.index)
    .slice(0, limit)
    .map(({ event }) => event);
}

export type FlagStats = {
  total: number;
  solved: number;
  attempts: number;
  /** Right attempts over all attempts, 0–100 rounded down; null before the first attempt. */
  accuracy: number | null;
};

export function flagStats(flagIds: number[], submissions: { flagId: number; isCorrect: boolean }[]): FlagStats {
  const known = new Set(flagIds);
  const relevant = submissions.filter((s) => known.has(s.flagId));
  const right = relevant.filter((s) => s.isCorrect);
  return {
    total: known.size,
    solved: new Set(right.map((s) => s.flagId)).size,
    attempts: relevant.length,
    accuracy: relevant.length === 0 ? null : Math.floor((right.length / relevant.length) * 100),
  };
}

export type QuizRow = {
  quizId: number;
  title: string;
  module: string;
  href: string;
  questions: number;
  passPercent: number;
  attempts: number;
  bestScore: number | null;
  passed: boolean;
};

export function quizRows(
  quizzes: Omit<QuizRow, "attempts" | "bestScore" | "passed">[],
  attempts: { quizId: number; score: number }[],
): QuizRow[] {
  return quizzes.map((quiz) => {
    const mine = attempts.filter((a) => a.quizId === quiz.quizId);
    const bestScore = mine.length === 0 ? null : Math.max(...mine.map((a) => a.score));
    return {
      ...quiz,
      attempts: mine.length,
      bestScore,
      passed: bestScore !== null && quizPassed(bestScore, quiz.questions, quiz.passPercent),
    };
  });
}
