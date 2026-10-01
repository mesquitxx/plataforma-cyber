/**
 * Reads and writes user progress (Phase 5). Every write runs in a single
 * transaction that records the attempt, updates the task and recomputes the
 * module with the pure rules of lib/progress-rules.ts. Server-only: quiz
 * answer keys and flag hashes never leave the server.
 */
import "server-only";
import { and, asc, count, eq, max, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  flagSubmissions,
  MANUAL_TASK_TYPES,
  moduleProgress,
  modules,
  quizAttempts,
  quizQuestions,
  quizzes,
  taskProgress,
  tasks,
  type ProgressStatus,
  type TaskType,
} from "@/db/schema";
import {
  gradedTaskStatus,
  gradeQuiz,
  manualModuleStatus,
  manualTaskStatus,
  moduleStatusAfterTaskChange,
  quizPassed,
} from "@/lib/progress-rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ---------- Module and tasks ----------

export type ModuleTaskView = {
  slug: string;
  title: string;
  type: TaskType;
  status: ProgressStatus;
};

/** Tasks of a module in order, with their progress. */
export function getModuleTasks(moduleSlug: string): ModuleTaskView[] {
  return db
    .select({
      slug: tasks.slug,
      title: tasks.title,
      type: tasks.type,
      status: sql<ProgressStatus>`coalesce(${taskProgress.status}, 'not_started')`,
    })
    .from(tasks)
    .innerJoin(modules, eq(modules.id, tasks.moduleId))
    .leftJoin(taskProgress, eq(taskProgress.taskId, tasks.id))
    .where(eq(modules.slug, moduleSlug))
    .orderBy(asc(tasks.sortOrder))
    .all();
}

function findTask(tx: Tx, moduleSlug: string, taskSlug: string) {
  return (
    tx
      .select({ id: tasks.id, moduleId: tasks.moduleId, type: tasks.type })
      .from(tasks)
      .innerJoin(modules, eq(modules.id, tasks.moduleId))
      .where(and(eq(modules.slug, moduleSlug), eq(tasks.slug, taskSlug)))
      .get() ?? null
  );
}

function setModuleStatus(tx: Tx, moduleId: number, current: ProgressStatus | undefined, next: ProgressStatus) {
  // A completed module keeps its timestamp (= completion date, shown on the
  // dashboard); an in-progress one is touched, so "continue" finds it.
  if (current === next && next === "completed") return;
  const values = { status: next, updatedAt: new Date() };
  tx.insert(moduleProgress)
    .values({ moduleId, ...values })
    .onConflictDoUpdate({ target: moduleProgress.moduleId, set: values })
    .run();
}

/** Writes a task status (if it changed) and recomputes its module. */
function applyTaskStatus(tx: Tx, taskId: number, moduleId: number, next: ProgressStatus, undoing: boolean) {
  const current = tx
    .select({ status: taskProgress.status })
    .from(taskProgress)
    .where(eq(taskProgress.taskId, taskId))
    .get()?.status;
  if (current !== next) {
    const values = { status: next, updatedAt: new Date() };
    tx.insert(taskProgress)
      .values({ taskId, ...values })
      .onConflictDoUpdate({ target: taskProgress.taskId, set: values })
      .run();
  }

  const statuses = tx
    .select({ status: taskProgress.status })
    .from(tasks)
    .leftJoin(taskProgress, eq(taskProgress.taskId, tasks.id))
    .where(eq(tasks.moduleId, moduleId))
    .all()
    .map((row) => row.status ?? undefined);
  const moduleCurrent = tx
    .select({ status: moduleProgress.status })
    .from(moduleProgress)
    .where(eq(moduleProgress.moduleId, moduleId))
    .get()?.status;
  setModuleStatus(tx, moduleId, moduleCurrent, moduleStatusAfterTaskChange(moduleCurrent, statuses, undoing));
}

function taskStatus(tx: Tx, taskId: number) {
  return tx.select({ status: taskProgress.status }).from(taskProgress).where(eq(taskProgress.taskId, taskId)).get()
    ?.status;
}

// ---------- Flags ----------

/**
 * Records a flag attempt and, when right, completes the task. Only wrong
 * attempts keep the typed value (CHECK constraint in the schema).
 */
export function recordFlagAttempt(flagId: number, taskId: number, moduleId: number, value: string, isCorrect: boolean) {
  db.transaction((tx) => {
    tx.insert(flagSubmissions)
      .values({ flagId, isCorrect, submittedValue: isCorrect ? null : value })
      .run();
    applyTaskStatus(tx, taskId, moduleId, gradedTaskStatus(taskStatus(tx, taskId), isCorrect), false);
  });
}

// ---------- Quizzes ----------

export type QuizView = {
  title: string;
  prompt: string | null;
  passPercent: number;
  /** Questions and options only: the answer key is not part of the view. */
  questions: { question: string; options: string[] }[];
  attempts: number;
  bestScore: number | null;
  passed: boolean;
};

function findQuiz(moduleSlug: string, taskSlug: string) {
  return (
    db
      .select({
        quizId: quizzes.id,
        taskId: tasks.id,
        moduleId: tasks.moduleId,
        title: tasks.title,
        prompt: tasks.prompt,
        passPercent: quizzes.passPercent,
      })
      .from(quizzes)
      .innerJoin(tasks, eq(tasks.id, quizzes.taskId))
      .innerJoin(modules, eq(modules.id, tasks.moduleId))
      .where(and(eq(modules.slug, moduleSlug), eq(tasks.slug, taskSlug), eq(tasks.type, "quiz")))
      .get() ?? null
  );
}

function getQuestions(quizId: number) {
  return db
    .select({
      question: quizQuestions.question,
      options: quizQuestions.options,
      answerIndex: quizQuestions.answerIndex,
      explanation: quizQuestions.explanation,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.sortOrder))
    .all();
}

/** Public view of a quiz task; null when the task was not ingested. */
export function getQuizTask(moduleSlug: string, taskSlug: string): QuizView | null {
  const quiz = findQuiz(moduleSlug, taskSlug);
  if (!quiz) return null;
  const stats = db
    .select({ attempts: count(), bestScore: max(quizAttempts.score) })
    .from(quizAttempts)
    .where(eq(quizAttempts.quizId, quiz.quizId))
    .get()!;
  const questions = getQuestions(quiz.quizId).map(({ question, options }) => ({ question, options }));
  return {
    title: quiz.title,
    prompt: quiz.prompt,
    passPercent: quiz.passPercent,
    questions,
    attempts: stats.attempts,
    bestScore: stats.bestScore,
    passed: stats.bestScore !== null && quizPassed(stats.bestScore, questions.length, quiz.passPercent),
  };
}

export type QuizGrade = {
  score: number;
  total: number;
  passed: boolean;
  /** Per question, revealed only after the attempt is recorded. */
  review: { correct: boolean; answer: number; explanation: string }[];
};

/**
 * Grades a quiz on the server, records the attempt and updates progress.
 * Null when the quiz does not exist or the answers do not fit it.
 */
export function submitQuizAttempt(moduleSlug: string, taskSlug: string, answers: number[]): QuizGrade | null {
  const quiz = findQuiz(moduleSlug, taskSlug);
  if (!quiz) return null;
  const questions = getQuestions(quiz.quizId);
  if (
    answers.length !== questions.length ||
    answers.some((a, i) => !Number.isInteger(a) || a < 0 || a >= questions[i].options.length)
  ) {
    return null;
  }

  const { results, score, total } = gradeQuiz(
    questions.map((q) => q.answerIndex),
    answers,
  );
  const passed = quizPassed(score, total, quiz.passPercent);
  db.transaction((tx) => {
    tx.insert(quizAttempts).values({ quizId: quiz.quizId, answers, score, total }).run();
    applyTaskStatus(tx, quiz.taskId, quiz.moduleId, gradedTaskStatus(taskStatus(tx, quiz.taskId), passed), false);
  });

  return {
    score,
    total,
    passed,
    review: questions.map((q, i) => ({ correct: results[i], answer: q.answerIndex, explanation: q.explanation })),
  };
}

// ---------- Manual marks ----------

const isManual = (type: TaskType) => (MANUAL_TASK_TYPES as readonly string[]).includes(type);

/** Ticks or unticks a reading/exercise/lab_step task. False if not allowed. */
export function setManualTask(moduleSlug: string, taskSlug: string, done: boolean): boolean {
  return db.transaction((tx) => {
    const task = findTask(tx, moduleSlug, taskSlug);
    if (!task || !isManual(task.type)) return false;
    applyTaskStatus(tx, task.id, task.moduleId, manualTaskStatus(done), !done);
    return true;
  });
}

/**
 * Completes or reopens a module by hand. Only for modules without tasks:
 * when a module has tasks, its completion comes from them.
 */
export function setModuleCompletion(moduleSlug: string, completed: boolean): boolean {
  return db.transaction((tx) => {
    const found = tx.select({ id: modules.id }).from(modules).where(eq(modules.slug, moduleSlug)).get();
    if (!found) return false;
    const taskCount = tx.select({ n: count() }).from(tasks).where(eq(tasks.moduleId, found.id)).get()!.n;
    if (taskCount > 0) return false;
    const current = tx
      .select({ status: moduleProgress.status })
      .from(moduleProgress)
      .where(eq(moduleProgress.moduleId, found.id))
      .get()?.status;
    setModuleStatus(tx, found.id, current, manualModuleStatus(completed));
    return true;
  });
}
