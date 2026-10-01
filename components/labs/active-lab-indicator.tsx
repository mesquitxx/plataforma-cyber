"use client";

import Link from "next/link";
import { LabStateDot } from "@/components/labs/lab-state-dot";
import { useLabStatus } from "@/hooks/use-lab-status";
import { getLab } from "@/lib/labs/catalog";
import { ACTION_LABELS, type LabAction } from "@/lib/labs/jobs";
import { RUN_STATE_LABELS } from "@/lib/labs/status";

/** Top bar: which lab is running (one at a time), linking to /laboratorios. */
export function ActiveLabIndicator() {
  const data = useLabStatus();
  const job = data?.current;
  const active = data?.status?.running[0] ?? null;
  const state = active ? data!.status!.states[active] : "stopped";

  let text = "Lab: —";
  if (data?.error) text = "Lab: Docker indisponível";
  else if (job) text = `Lab: ${ACTION_LABELS[job.action as LabAction].toLowerCase()} ${getLab(job.lab)?.title ?? job.lab}…`;
  else if (active) text = `Lab: ${getLab(active)?.title ?? active} · ${RUN_STATE_LABELS[state]}`;
  else if (data) text = "Lab: nenhum ativo";

  return (
    <Link
      href="/laboratorios"
      className="ml-auto flex items-center gap-2 rounded-md px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-live="polite"
    >
      <LabStateDot state={job ? "starting" : state} />
      {text}
    </Link>
  );
}
