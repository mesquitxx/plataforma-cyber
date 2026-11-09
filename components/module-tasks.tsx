import { CircleCheck, Circle, CirclePlay, Flag, ListChecks, ListTodo, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ModuleTaskView } from "@/db/queries/progress";
import type { ProgressStatus, TaskType } from "@/db/schema";
import { cn } from "@/lib/utils";
import { ModuleCompletionButton, TaskCheckbox } from "./module-task-controls";

const STATUS_META: Record<ProgressStatus, { label: string; icon: LucideIcon; className: string }> = {
  completed: { label: "Concluída", icon: CircleCheck, className: "text-primary" },
  in_progress: { label: "Em andamento", icon: CirclePlay, className: "text-info" },
  not_started: { label: "Não iniciada", icon: Circle, className: "text-muted-foreground" },
};

const TYPE_LABEL: Record<TaskType, string> = {
  reading: "leitura",
  exercise: "exercício",
  lab_step: "etapa do lab",
  flag: "flag",
  quiz: "quiz",
};

type ModuleTasksProps = {
  moduleSlug: string;
  tasks: ModuleTaskView[];
  moduleCompleted: boolean;
  /** Link to each graded task's card (the module is paginated: it may be in another part). */
  taskHrefs?: Record<string, string>;
};

/**
 * "Tarefas do módulo" panel, generated from the front-matter at the end of
 * every module page. Flags and quizzes link to their cards (graded there);
 * reading, exercise and lab step tasks are ticked by hand. A card may sit in
 * another part of the paginated module, hence `taskHrefs` (default: anchor
 * on the same page). A module without tasks gets a manual "complete /
 * reopen" button instead.
 */
export function ModuleTasks({ moduleSlug, tasks, moduleCompleted, taskHrefs = {} }: ModuleTasksProps) {
  return (
    <section aria-labelledby="tarefas-do-modulo" className="rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 id="tarefas-do-modulo" className="flex items-center gap-2 font-semibold">
          <ListTodo className="size-4 text-primary" aria-hidden />
          Tarefas do módulo
        </h2>
        {tasks.length > 0 && (
          <span className="font-mono text-xs text-muted-foreground">
            {tasks.filter((t) => t.status === "completed").length}/{tasks.length} concluídas
          </span>
        )}
      </header>

      {tasks.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            Este módulo não tem tarefas verificáveis. Marque-o quando terminar o estudo.
          </p>
          <ModuleCompletionButton moduleSlug={moduleSlug} completed={moduleCompleted} />
        </div>
      ) : (
        <ul className="divide-y">
          {tasks.map((task) => {
            const meta = STATUS_META[task.status];
            const graded = task.type === "flag" || task.type === "quiz";
            const TypeIcon = task.type === "flag" ? Flag : task.type === "quiz" ? ListChecks : null;
            return (
              <li key={task.slug} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {graded ? (
                  <meta.icon className={cn("size-4 shrink-0", meta.className)} aria-label={meta.label} role="img" />
                ) : (
                  <TaskCheckbox
                    moduleSlug={moduleSlug}
                    taskSlug={task.slug}
                    title={task.title}
                    done={task.status === "completed"}
                  />
                )}
                <span className="min-w-0 flex-1">
                  {graded ? (
                    <Link
                      href={taskHrefs[task.slug] ?? `#tarefa-${task.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {task.title}
                    </Link>
                  ) : (
                    task.title
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground">
                  {TypeIcon && <TypeIcon className="size-3.5" aria-hidden />}
                  {TYPE_LABEL[task.type]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
