import { CircleCheck, Flag, TriangleAlert } from "lucide-react";
import { getFlagTask } from "@/db/queries/content";
import { FlagForm } from "./flag-form";
import { Hint } from "./reveal";

type FlagInputProps = {
  /** Task slug declared in the module front-matter with type: flag. */
  task: string;
  /** Bound by the module page; MDX authors never pass it. */
  moduleSlug?: string;
};

export function FlagInput({ task, moduleSlug }: FlagInputProps) {
  const view = moduleSlug ? getFlagTask(moduleSlug, task) : null;

  if (!moduleSlug || !view) {
    return (
      <div
        role="note"
        className="not-prose my-6 flex gap-2 rounded-lg border border-dashed border-warning/40 px-4 py-3 text-sm text-warning"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        {moduleSlug
          ? `A tarefa "${task}" não está no banco. Rode npm run content:ingest.`
          : "FlagInput só funciona dentro da página de um módulo."}
      </div>
    );
  }

  return (
    <section className="not-prose my-6 rounded-lg border border-primary/30 bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h4 className="flex items-center gap-2 font-semibold">
          <Flag className="size-4 text-primary" aria-hidden />
          {view.title}
        </h4>
        {view.solved ? (
          <span className="flex items-center gap-1 font-mono text-xs text-primary">
            <CircleCheck className="size-3.5" aria-hidden /> resolvida
          </span>
        ) : (
          view.wrongAttempts > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              {view.wrongAttempts} {view.wrongAttempts === 1 ? "tentativa" : "tentativas"}
            </span>
          )
        )}
      </header>
      <div className="space-y-3 px-4 py-3">
        {view.prompt && <p className="text-sm text-muted-foreground">{view.prompt}</p>}
        <FlagForm moduleSlug={moduleSlug} taskSlug={task} solved={view.solved} />
        {view.hint && (
          <Hint title="Dica da flag">
            <p className="text-sm">{view.hint}</p>
          </Hint>
        )}
      </div>
    </section>
  );
}
