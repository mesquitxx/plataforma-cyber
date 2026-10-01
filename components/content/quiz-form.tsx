"use client";

import { useActionState, useState } from "react";
import { CircleCheck, CircleX, LoaderCircle, RotateCcw } from "lucide-react";
import { submitQuiz, type QuizResult } from "@/app/trilhas/[trackSlug]/[moduleSlug]/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InlineCode } from "./inline-code";

type QuizFormProps = {
  moduleSlug: string;
  taskSlug: string;
  /** Questions and options only: the answer key never reaches the browser. */
  questions: { question: string; options: string[] }[];
  passMark: number;
};

const IDLE: QuizResult = { status: "idle" };

export function QuizForm({ moduleSlug, taskSlug, questions, passMark }: QuizFormProps) {
  const [result, action, pending] = useActionState(submitQuiz, IDLE);
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  // Bumped by "Refazer" to remount the form and drop the previous review.
  const [round, setRound] = useState(0);
  const [shownRound, setShownRound] = useState(-1);

  const graded = result.status === "graded" && shownRound === round ? result : null;
  const answered = picked.filter((p) => p !== null).length;

  function retry() {
    setPicked(questions.map(() => null));
    setRound((r) => r + 1);
  }

  return (
    <form action={action} onSubmit={() => setShownRound(round)} key={round}>
      <input type="hidden" name="moduleSlug" value={moduleSlug} />
      <input type="hidden" name="taskSlug" value={taskSlug} />
      <input type="hidden" name="total" value={questions.length} />

      <ol className="divide-y">
        {questions.map((q, qi) => {
          const review = graded?.review[qi];
          return (
            <li key={qi} className="px-4 py-4">
              <fieldset disabled={graded !== null || pending}>
                <legend className="mb-3 flex gap-2 font-medium">
                  <span className="font-mono text-sm text-muted-foreground">{qi + 1}.</span>
                  <span>
                    <InlineCode text={q.question} />
                  </span>
                </legend>
                <div className="grid gap-1.5">
                  {q.options.map((option, oi) => {
                    const selected = picked[qi] === oi;
                    const isAnswer = review?.answer === oi;
                    return (
                      <label
                        key={oi}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                          selected && !review && "border-primary/60 bg-primary/5",
                          review && isAnswer && "border-primary/60 bg-primary/10",
                          review && selected && !isAnswer && "border-destructive/60 bg-destructive/10",
                          review && "cursor-default hover:bg-transparent",
                        )}
                      >
                        <input
                          type="radio"
                          name={`q${qi}`}
                          value={oi}
                          checked={selected}
                          required
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
              {review && (
                <div
                  className={cn(
                    "mt-3 flex gap-2 rounded-md px-3 py-2 text-sm",
                    review.correct ? "bg-primary/10" : "bg-destructive/10",
                  )}
                >
                  {review.correct ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Correta" />
                  ) : (
                    <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Incorreta" />
                  )}
                  <p>
                    <InlineCode text={review.explanation} />
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3">
        <p role="status" aria-live="polite" className="mr-auto text-sm">
          {graded ? (
            <span className={cn("font-medium", graded.passed ? "text-primary" : "text-destructive")}>
              {graded.score}/{graded.total} corretas —{" "}
              {graded.passed ? "aprovado! Tarefa concluída." : `faltou pouco: são ${passMark} para passar.`}
            </span>
          ) : result.status === "invalid" && shownRound === round ? (
            <span className="text-destructive">{result.message}</span>
          ) : (
            answered < questions.length && (
              <span className="text-xs text-muted-foreground">
                {answered}/{questions.length} respondidas · responda todas para conferir.
              </span>
            )
          )}
        </p>
        {graded ? (
          <Button type="button" variant="outline" onClick={retry}>
            <RotateCcw aria-hidden /> Refazer
          </Button>
        ) : (
          <Button type="submit" disabled={answered < questions.length || pending}>
            {pending && <LoaderCircle className="animate-spin" aria-hidden />}
            Conferir respostas
          </Button>
        )}
      </footer>
    </form>
  );
}
