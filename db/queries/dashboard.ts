/**
 * Reads the user state for the dashboard (/painel) and shapes it with the
 * pure functions of lib/dashboard.ts, lib/activity.ts and lib/achievements.ts.
 * Small tables, read whole. Server-only.
 */
import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  flagSubmissions,
  flags,
  MANUAL_TASK_TYPES,
  quizAttempts,
  quizQuestions,
  quizzes,
  taskProgress,
  tasks,
} from "@/db/schema";
import { computeAchievements, type Achievement } from "@/lib/achievements";
import { computeStreaks } from "@/lib/activity";
import type { CurriculumView, ModuleView } from "@/lib/curriculum-state";
import {
  flagStats,
  quizRows,
  recentActivity,
  type ActivityEvent,
  type FlagStats,
  type QuizRow,
} from "@/lib/dashboard";

export type Dashboard = {
  flags: FlagStats;
  quizzes: QuizRow[];
  streak: { current: number; best: number };
  recent: ActivityEvent[];
  achievements: Achievement[];
};

export function getDashboard(curriculum: CurriculumView, now = new Date()): Dashboard {
  const moduleById = new Map(curriculum.modules.map((m) => [m.id, m]));
  const label = (m: ModuleView) => `${m.number} ${m.title}`;

  const flagRows = db
    .select({ flagId: flags.id, title: tasks.title, taskSlug: tasks.slug, moduleId: tasks.moduleId })
    .from(flags)
    .innerJoin(tasks, eq(tasks.id, flags.taskId))
    .all();
  const flagById = new Map(flagRows.map((f) => [f.flagId, f]));
  const submissions = db.select().from(flagSubmissions).orderBy(asc(flagSubmissions.id)).all();

  const quizRowsRaw = db
    .select({
      quizId: quizzes.id,
      title: tasks.title,
      taskSlug: tasks.slug,
      moduleId: tasks.moduleId,
      passPercent: quizzes.passPercent,
      questions: count(quizQuestions.sortOrder),
    })
    .from(quizzes)
    .innerJoin(tasks, eq(tasks.id, quizzes.taskId))
    .leftJoin(quizQuestions, eq(quizQuestions.quizId, quizzes.id))
    .groupBy(quizzes.id)
    .all();
  const quizById = new Map(quizRowsRaw.map((q) => [q.quizId, q]));
  const attempts = db.select().from(quizAttempts).orderBy(asc(quizAttempts.id)).all();

  const allTaskUpdates = db.select({ updatedAt: taskProgress.updatedAt }).from(taskProgress).all();
  // Flags and quizzes already show as attempts; manual ticks show on their own.
  const doneTasks = db
    .select({ title: tasks.title, moduleId: tasks.moduleId, updatedAt: taskProgress.updatedAt })
    .from(taskProgress)
    .innerJoin(tasks, eq(tasks.id, taskProgress.taskId))
    .where(and(inArray(tasks.type, [...MANUAL_TASK_TYPES]), eq(taskProgress.status, "completed")))
    .all();

  // ---- Events (only those whose module still exists in the curriculum) ----
  const events: ActivityEvent[] = [];
  for (const s of submissions) {
    const flag = flagById.get(s.flagId);
    const owner = flag && moduleById.get(flag.moduleId);
    if (!flag || !owner) continue;
    events.push({
      kind: s.isCorrect ? "flag_correct" : "flag_wrong",
      at: s.submittedAt,
      title: flag.title,
      detail: null,
      module: label(owner),
      href: `${owner.href}#tarefa-${flag.taskSlug}`,
    });
  }
  for (const a of attempts) {
    const quiz = quizById.get(a.quizId);
    const owner = quiz && moduleById.get(quiz.moduleId);
    if (!quiz || !owner) continue;
    events.push({
      kind: "quiz",
      at: a.submittedAt,
      title: quiz.title,
      detail: `${a.score}/${a.total}`,
      module: label(owner),
      href: `${owner.href}#tarefa-${quiz.taskSlug}`,
    });
  }
  for (const t of doneTasks) {
    const owner = moduleById.get(t.moduleId);
    if (!owner) continue;
    events.push({ kind: "task_done", at: t.updatedAt, title: t.title, detail: null, module: label(owner), href: owner.href });
  }
  for (const m of curriculum.modules) {
    if (m.state !== "completed" || !m.updatedAt) continue;
    events.push({ kind: "module_done", at: m.updatedAt, title: m.title, detail: null, module: label(m), href: m.href });
  }

  // ---- Study days: any attempt or mark ----
  const activity = [
    ...submissions.map((s) => s.submittedAt),
    ...attempts.map((a) => a.submittedAt),
    ...allTaskUpdates.map((t) => t.updatedAt),
    ...curriculum.modules.flatMap((m) => (m.updatedAt ? [m.updatedAt] : [])),
  ];
  const streaks = computeStreaks(activity, now);

  return {
    flags: flagStats(
      flagRows.map((f) => f.flagId),
      submissions,
    ),
    quizzes: quizRows(
      quizRowsRaw.flatMap((q) => {
        const owner = moduleById.get(q.moduleId);
        return owner
          ? [
              {
                quizId: q.quizId,
                title: q.title,
                module: label(owner),
                href: `${owner.href}#tarefa-${q.taskSlug}`,
                questions: q.questions,
                passPercent: q.passPercent,
              },
            ]
          : [];
      }),
      attempts,
    ),
    streak: { current: streaks.current, best: streaks.best },
    recent: recentActivity(events),
    achievements: computeAchievements({
      modules: curriculum.tracks.flatMap((track) =>
        track.modules.map((m) => ({
          trackNumber: track.number,
          completedAt: m.state === "completed" ? m.updatedAt : null,
        })),
      ),
      flagSubmissions: submissions,
      quizAttempts: attempts,
      streaks,
    }),
  };
}
