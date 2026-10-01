"use client";

import { useId, useState } from "react";
import { CircleCheck, CircleX, ListChecks, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InlineCode } from "./inline-code";

export type QuizQuestion = {
  question: string;
  options: string[];
  /** Index of the correct option (0-based). */
  answer: number;
  /** Why the answer is right (and the others are not). Shown after checking. */
  explanation: string;
};

type QuizProps = {
  title?: string;
  questions: QuizQuestion[];
};

/**
 * Self-assessment quiz. Answers ship to the browser by design: the quiz is
 * for practice, not for scoring (flags are the checked part, on the server).
 * Results are not saved yet (Phase 5).
 */
export function Quiz({ title = "Quiz", questions }: QuizProps) {
  const id = useId();
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const [checked, setChecked] = useState(false);

  const answered = picked.filter((p) => p !== null).length;
  const score = picked.filter((p, i) => p === questions[i].answer).length;

  function reset() {
    setPicked(questions.map(() => null));
    setChecked(false);
  }

  return (
    <section className="not-prose my-8 rounded-lg border bg-card" aria-labelledby={`${id}-title`}>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 id={`${id}-title`} className="flex items-center gap-2 font-semibold">
          <ListChecks className="size-4 text-primary" aria-hidden />
          {title}
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          {checked ? `${score}/${questions.length} corretas` : `${answered}/${questions.length} respondidas`}
        </span>
      </header>

      <ol className="divide-y">
        {questions.map((q, qi) => {
          const isRight = picked[qi] === q.answer;
          return (
            <li key={qi} className="px-4 py-4">
              <fieldset disabled={checked}>
                <legend className="mb-3 flex gap-2 font-medium">
                  <span className="font-mono text-sm text-muted-foreground">{qi + 1}.</span>
                  <span>
                    <InlineCode text={q.question} />
                  </span>
                </legend>
                <div className="grid gap-1.5">
                  {q.options.map((option, oi) => {
                    const selected = picked[qi] === oi;
                    const correct = oi === q.answer;
                    return (
                      <label
                        key={oi}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                          selected && !checked && "border-primary/60 bg-primary/5",
                          checked && correct && "border-primary/60 bg-primary/10",
                          checked && selected && !correct && "border-destructive/60 bg-destructive/10",
                          checked && "cursor-default hover:bg-transparent",
                        )}
                      >
                        <input
                          type="radio"
                          name={`${id}-q${qi}`}
                          checked={selected}
                          onChange={() => setPicked((prev) => prev.map((p, i) => (i === qi ? oi : p)))}
                          className="mt-0.5 accent-(--primary)"
                        />
                        <span>
                          <InlineCode text={option} />
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {checked && (
                <div
                  className={cn(
                    "mt-3 flex gap-2 rounded-md px-3 py-2 text-sm",
                    isRight ? "bg-primary/10" : "bg-destructive/10",
                  )}
                >
                  {isRight ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Correta" />
                  ) : (
                    <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Incorreta" />
                  )}
                  <p>
                    <InlineCode text={q.explanation} />
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3">
        {!checked && answered < questions.length && (
          <span className="text-xs text-muted-foreground">Responda todas para conferir.</span>
        )}
        {checked ? (
          <Button type="button" variant="outline" onClick={reset}>
            <RotateCcw aria-hidden /> Refazer
          </Button>
        ) : (
          <Button type="button" onClick={() => setChecked(true)} disabled={answered < questions.length}>
            Conferir respostas
          </Button>
        )}
      </footer>
    </section>
  );
}
