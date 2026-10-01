"use client";

import { useOptimistic, useTransition } from "react";
import { CircleCheck, LoaderCircle, RotateCcw } from "lucide-react";
import { toggleModuleCompleted, toggleTask } from "@/app/trilhas/[trackSlug]/[moduleSlug]/actions";
import { Button } from "@/components/ui/button";

type TaskCheckboxProps = {
  moduleSlug: string;
  taskSlug: string;
  title: string;
  done: boolean;
};

/** Ticks a reading, exercise or lab step task; the server recomputes the module. */
export function TaskCheckbox({ moduleSlug, taskSlug, title, done }: TaskCheckboxProps) {
  const [pending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);

  return (
    <input
      type="checkbox"
      checked={optimisticDone}
      disabled={pending}
      aria-label={`Marcar "${title}" como feita`}
      className="size-4 shrink-0 cursor-pointer accent-(--primary) disabled:cursor-wait"
      onChange={(event) => {
        const next = event.target.checked;
        startTransition(async () => {
          setOptimisticDone(next);
          await toggleTask({ moduleSlug, taskSlug, done: next });
        });
      }}
    />
  );
}

/** Completes or reopens a module without tasks. */
export function ModuleCompletionButton({ moduleSlug, completed }: { moduleSlug: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();
  const toggle = () =>
    startTransition(async () => {
      await toggleModuleCompleted({ moduleSlug, completed: !completed });
    });

  return completed ? (
    <Button type="button" variant="outline" size="sm" onClick={toggle} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
      Reabrir módulo
    </Button>
  ) : (
    <Button type="button" size="sm" onClick={toggle} disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <CircleCheck aria-hidden />}
      Marcar módulo como concluído
    </Button>
  );
}
