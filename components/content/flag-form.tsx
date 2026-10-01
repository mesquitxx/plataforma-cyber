"use client";

import { useActionState } from "react";
import { CircleCheck, CircleX, Flag, LoaderCircle } from "lucide-react";
import { submitFlag, type FlagResult } from "@/app/trilhas/[trackSlug]/[moduleSlug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_FLAG_LENGTH } from "@/lib/flag-hash-limits";

type FlagFormProps = {
  moduleSlug: string;
  taskSlug: string;
  solved: boolean;
};

const IDLE: FlagResult = { status: "idle", message: "" };

export function FlagForm({ moduleSlug, taskSlug, solved }: FlagFormProps) {
  const [result, action, pending] = useActionState(submitFlag, IDLE);
  const inputId = `flag-${taskSlug}`;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="moduleSlug" value={moduleSlug} />
      <input type="hidden" name="taskSlug" value={taskSlug} />
      <label htmlFor={inputId} className="sr-only">
        Flag
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          name="flag"
          placeholder={solved ? "Já resolvida — pode enviar de novo" : "FLAG{...}"}
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_FLAG_LENGTH}
          required
          className="font-mono"
          aria-describedby={`${inputId}-result`}
        />
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Flag aria-hidden />}
          Enviar
        </Button>
      </div>
      <p id={`${inputId}-result`} role="status" aria-live="polite" className="min-h-5 text-sm">
        {result.status === "correct" && (
          <span className="flex items-center gap-1.5 text-primary">
            <CircleCheck className="size-4" aria-hidden /> {result.message}
          </span>
        )}
        {(result.status === "incorrect" || result.status === "invalid") && (
          <span className="flex items-center gap-1.5 text-destructive">
            <CircleX className="size-4" aria-hidden /> {result.message}
          </span>
        )}
      </p>
    </form>
  );
}
