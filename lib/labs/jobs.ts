/**
 * Lab operations ("jobs") started by the platform (Phase 6): the closed list
 * of actions, the shape the interface polls, and how an exit code of
 * scripts/lab.sh becomes a message. Pure; the process itself is handled by
 * lib/labs/runner.ts.
 */
import type { LabsStatus } from "./status";

/** Actions the platform may run. pull, rebuild and purge stay terminal-only. */
export const LAB_ACTIONS = ["up", "down", "switch", "reset", "verify"] as const;
export type LabAction = (typeof LAB_ACTIONS)[number];

export const ACTION_LABELS: Record<LabAction, string> = {
  up: "Iniciando",
  down: "Parando",
  switch: "Trocando de lab",
  reset: "Resetando",
  verify: "Verificando o isolamento",
};

export type LabJob = {
  id: number;
  action: LabAction;
  lab: string;
  startedAt: number;
  finishedAt: number | null;
  /** null while running; -1 when the process could not start or was killed. */
  exitCode: number | null;
  /** Last lines of stdout and stderr, oldest first. */
  output: string[];
};

/** A job as GET /api/labs/status returns it, with its message in Portuguese. */
export type JobView = LabJob & { message: string };

/** Body of GET /api/labs/status. */
export type LabsStatusResponse = {
  /** null when Docker could not be read (e.g. the daemon is not running). */
  status: LabsStatus | null;
  error: string | null;
  current: JobView | null;
  last: JobView | null;
};

export const MAX_OUTPUT_LINES = 400;

/** Appends a chunk of process output, keeping the last MAX_OUTPUT_LINES lines. */
export function appendOutput(lines: string[], chunk: string): string[] {
  const added = chunk.replace(/\r/g, "").split("\n");
  const merged = [...lines];
  // The first piece continues the last line if that line had no newline yet.
  if (merged.length > 0 && merged[merged.length - 1] !== "") {
    merged[merged.length - 1] += added.shift() ?? "";
  } else if (merged.length > 0) {
    merged.pop();
  }
  merged.push(...added);
  return merged.slice(-MAX_OUTPUT_LINES);
}

/** What the exit code of scripts/lab.sh means, in Portuguese, for the interface. */
export function exitMessage(job: Pick<LabJob, "action" | "lab" | "exitCode">): string {
  switch (job.exitCode) {
    case null:
      return `${ACTION_LABELS[job.action]}…`;
    case 0:
      return job.action === "verify" ? "Isolamento verificado: todos os testes passaram." : "Concluído.";
    case 3:
      return `Faltam imagens deste lab. A plataforma nunca usa a internet: baixe-as no terminal com scripts/lab.sh pull ${job.lab}.`;
    case 4:
      return "Outra operação de laboratório está em andamento (talvez no terminal). Espere terminar e tente de novo.";
    case 5:
      return "Outro laboratório está rodando (um por vez). Pare-o primeiro ou use “Trocar para este lab”.";
    case 6:
      return "Este comando só roda no terminal.";
    default:
      return job.action === "verify"
        ? "A verificação de isolamento encontrou falhas: veja o log abaixo."
        : "A operação falhou: veja o log abaixo.";
  }
}
