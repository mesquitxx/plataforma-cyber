import { CircleCheck, ListChecks, TriangleAlert } from "lucide-react";
import { getQuizTask } from "@/db/queries/progress";
import { quizPassMark } from "@/lib/progress-rules";
import { QuizForm } from "./quiz-form";

type QuizProps = {
  /** Task slug declared in the module front-matter with type: quiz. */
  task: string;
  /** Bound by the module page; MDX authors never pass it. */
  moduleSlug?: string;
};

/**
 * Quiz of a module (Phase 5): questions live in the front-matter, the answer
 * key stays on the server and grading is a Server Action. The browser only
 * gets questions and options; the review comes back after each attempt.
 */
export function Quiz({ task, moduleSlug }: QuizProps) {
  const view = moduleSlug ? getQuizTask(moduleSlug, task) : null;

  if (!moduleSlug || !view) {
    return (
      <div
        role="note"
        className="not-prose my-6 flex gap-2 rounded-lg border border-dashed border-warning/40 px-4 py-3 text-sm text-warning"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        {moduleSlug
          ? `O quiz "${task}" não está no banco. Rode npm run content:ingest.`
          : "Quiz só funciona dentro da página de um módulo."}
      </div>
    );
  }

  const total = view.questions.length;
  return (
    <section
      id={`tarefa-${task}`}
      className="not-prose my-8 scroll-mt-20 rounded-lg border bg-card"
      aria-labelledby={`tarefa-${task}-title`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h3 id={`tarefa-${task}-title`} className="flex items-center gap-2 font-semibold">
          <ListChecks className="size-4 text-primary" aria-hidden />
          {view.title}
        </h3>
        <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
          {view.passed && <CircleCheck className="size-3.5 text-primary" aria-hidden />}
          {view.bestScore === null
            ? `aprovação: ${quizPassMark(total, view.passPercent)}/${total}`
            : `melhor nota: ${view.bestScore}/${total} · ${view.attempts} ${view.attempts === 1 ? "tentativa" : "tentativas"}`}
        </span>
      </header>
      {view.prompt && <p className="border-b px-4 py-3 text-sm text-muted-foreground">{view.prompt}</p>}
      <QuizForm
        moduleSlug={moduleSlug}
        taskSlug={task}
        questions={view.questions}
        passMark={quizPassMark(total, view.passPercent)}
      />
    </section>
  );
}
