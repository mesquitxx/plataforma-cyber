"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight, LoaderCircle, Play, RotateCcw, ShieldCheck, Square, TriangleAlert } from "lucide-react";
import { runLabAction } from "@/app/laboratorios/actions";
import { CopyButton } from "@/components/content/copy-button";
import { KaliDesktop } from "@/components/labs/kali-desktop";
import { LabStateDot } from "@/components/labs/lab-state-dot";
import { Button } from "@/components/ui/button";
import { refreshLabStatus, useLabStatus } from "@/hooks/use-lab-status";
import { SANDBOX_SHELL_COMMAND, getLab } from "@/lib/labs/catalog";
import { ACTION_LABELS, type JobView, type LabAction } from "@/lib/labs/jobs";
import { RUN_STATE_LABELS } from "@/lib/labs/status";

/**
 * Live controls of one available lab: state, start/stop/reset/switch/verify,
 * the running operation's log and, once a desktop lab is up, the embedded
 * Kali desktop. State comes from Docker through useLabStatus().
 */
export function LabControls({ slug }: { slug: string }) {
  const lab = getLab(slug)!;
  const data = useLabStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const state = data?.status?.states[slug] ?? "stopped";
  const others = data?.status?.running.filter((s) => s !== slug) ?? [];
  const foreign = data?.status?.foreign ?? [];
  const busy = pending || data?.current != null;
  const ownJob = data?.current?.lab === slug ? data.current : null;
  const lastJob = data?.last?.lab === slug && !ownJob ? data.last : null;

  function run(action: LabAction) {
    const confirmations: Partial<Record<LabAction, string>> = {
      reset: `Resetar "${lab.title}"?\n\n${lab.reset}`,
      switch: `Desligar ${others.map((s) => `"${getLab(s)?.title ?? s}"`).join(", ")} e iniciar "${lab.title}"?`,
    };
    const question = confirmations[action];
    if (question && !window.confirm(question)) return;
    startTransition(async () => {
      const result = await runLabAction({ action, lab: slug });
      setError(result.ok ? null : result.error);
      await refreshLabStatus();
    });
  }

  if (data === null) {
    return <p className="font-mono text-xs text-muted-foreground">Lendo o estado do Docker…</p>;
  }
  if (data.error) {
    return (
      <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
        <TriangleAlert className="size-4" aria-hidden />
        {data.error}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex items-center gap-2 font-mono text-sm" aria-live="polite">
          <LabStateDot state={ownJob ? "starting" : state} />
          {ownJob ? `${ACTION_LABELS[ownJob.action as LabAction]}…` : RUN_STATE_LABELS[state]}
        </p>

        <div className="flex flex-wrap gap-2">
          {state === "stopped" && others.length === 0 && (
            <Button size="sm" onClick={() => run("up")} disabled={busy || foreign.length > 0}>
              <Play aria-hidden /> Iniciar
            </Button>
          )}
          {state === "stopped" && others.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => run("switch")} disabled={busy}>
              <ArrowLeftRight aria-hidden /> Trocar para este lab
            </Button>
          )}
          {state !== "stopped" && (
            <>
              <Button size="sm" variant="outline" onClick={() => run("down")} disabled={busy}>
                <Square aria-hidden /> Parar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => run("reset")} disabled={busy}>
                <RotateCcw aria-hidden /> Resetar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => run("verify")} disabled={busy || state !== "running"}>
                <ShieldCheck aria-hidden /> Verificar isolamento
              </Button>
            </>
          )}
        </div>
      </div>

      {state === "stopped" && others.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Um laboratório por vez: agora está rodando{" "}
          <span className="font-mono text-foreground">{others.map((s) => getLab(s)?.title ?? s).join(", ")}</span>.
        </p>
      )}
      {foreign.length > 0 && (
        <p role="alert" className="text-xs text-warning">
          Há contêineres de fora da plataforma rodando ({foreign.join(", ")}). Pare-os no terminal antes de iniciar
          um lab.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {ownJob && <JobLog job={ownJob} live />}
      {lastJob && <JobLog job={lastJob} />}

      {lab.kind === "sandbox" && state === "running" && SANDBOX_SHELL_COMMAND[slug] && (
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">
            O shell abre no terminal do WSL (a plataforma não tem terminal web, de propósito):
          </p>
          <div className="flex w-fit items-center gap-2 rounded-md border bg-muted/40 py-1 pr-1 pl-3 font-mono text-sm">
            {SANDBOX_SHELL_COMMAND[slug]}
            <CopyButton text={SANDBOX_SHELL_COMMAND[slug]} />
          </div>
        </div>
      )}
      {lab.kind === "desktop" && state === "running" && !ownJob && <KaliDesktop slug={slug} />}
    </div>
  );
}

function JobLog({ job, live = false }: { job: JobView; live?: boolean }) {
  const failed = job.exitCode !== null && job.exitCode !== 0;
  const lines = job.output.join("\n").trimEnd();
  return (
    <div className="space-y-1.5">
      <p
        role={failed ? "alert" : undefined}
        className={`flex items-center gap-2 text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}
      >
        {live && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {job.message}
      </p>
      {lines && (
        <details open={live || (failed && job.action === "verify")} className="group">
          <summary className="cursor-pointer font-mono text-xs text-muted-foreground hover:text-foreground">
            {live ? "Log ao vivo" : "Ver log da última operação"}
          </summary>
          <pre className="mt-1.5 max-h-72 overflow-auto rounded-md border bg-black/40 p-3 font-mono text-[0.7rem] leading-relaxed whitespace-pre-wrap">
            {live ? job.output.slice(-40).join("\n") : lines}
          </pre>
        </details>
      )}
    </div>
  );
}
