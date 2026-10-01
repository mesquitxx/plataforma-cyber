/**
 * Runs scripts/lab.sh for the platform (Phase 6, security trade-off T1 in
 * docs/LABORATORIO.md). The only process this app ever starts:
 * - the program is the fixed path of scripts/lab.sh, run without a shell;
 * - arguments are one action from LAB_ACTIONS and one slug from
 *   AVAILABLE_LAB_SLUGS (callers validate with zod; checked again here);
 * - the environment is minimal and marks the caller as the platform, so
 *   lab.sh refuses the terminal-only commands (pull, rebuild, purge).
 * One job at a time per app; lab.sh's flock also covers the terminal.
 */
import "server-only";
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { AVAILABLE_LAB_SLUGS } from "./catalog";
import { LAB_ACTIONS, appendOutput, type LabAction, type LabJob } from "./jobs";
import { parseStatusOutput, summarizeStatus, type LabsStatus } from "./status";

const LAB_SCRIPT = path.join(process.cwd(), "scripts", "lab.sh");
/** Longest a lab operation may take (first start, healthchecks, DVWA setup). */
const JOB_TIMEOUT_MS = 10 * 60 * 1000;

function childEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    LANG: "C.UTF-8",
    // Plain, uncoloured Compose output for the log panel.
    COMPOSE_ANSI: "never",
    NO_COLOR: "1",
    CYBERLAB_CALLER: "platform",
    ...(process.env.DOCKER_HOST ? { DOCKER_HOST: process.env.DOCKER_HOST } : {}),
  };
}

type JobStore = { current: LabJob | null; last: LabJob | null; nextId: number };

// Survives hot reloads in `next dev`, so a running job is never forgotten.
const store: JobStore = ((globalThis as { __cyberlabJobs?: JobStore }).__cyberlabJobs ??= {
  current: null,
  last: null,
  nextId: 1,
});

export type StartResult = { ok: true; job: LabJob } | { ok: false; error: string };

export function startLabJob(action: LabAction, lab: string): StartResult {
  // Defense in depth: the Server Action validated already.
  if (!LAB_ACTIONS.includes(action) || !AVAILABLE_LAB_SLUGS.includes(lab)) {
    return { ok: false, error: "Ação ou laboratório desconhecido." };
  }
  if (store.current) {
    return { ok: false, error: "Já há uma operação de laboratório em andamento. Espere terminar." };
  }

  const job: LabJob = {
    id: store.nextId++,
    action,
    lab,
    startedAt: Date.now(),
    finishedAt: null,
    exitCode: null,
    output: [],
  };
  store.current = job;

  const finish = (code: number) => {
    if (job.finishedAt !== null) return;
    job.exitCode = code;
    job.finishedAt = Date.now();
    store.last = job;
    if (store.current === job) store.current = null;
  };

  const child = spawn(LAB_SCRIPT, [action, lab], {
    cwd: process.cwd(),
    env: childEnv(),
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: JOB_TIMEOUT_MS,
  });
  const collect = (chunk: Buffer) => {
    job.output = appendOutput(job.output, chunk.toString("utf8"));
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  child.on("error", (error) => {
    collect(Buffer.from(`\n${error.message}\n`));
    finish(-1);
  });
  child.on("close", (code) => finish(code ?? -1));

  return { ok: true, job };
}

export function getLabJobs(): { current: LabJob | null; last: LabJob | null } {
  return { current: store.current, last: store.last };
}

/** Live state of every lab, read from Docker through `lab.sh status`. */
export function readLabsStatus(): Promise<LabsStatus> {
  return new Promise((resolve, reject) => {
    execFile(
      LAB_SCRIPT,
      ["status"],
      { cwd: process.cwd(), env: childEnv(), timeout: 15_000, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`lab.sh status failed: ${stderr.trim() || error.message}`));
          return;
        }
        resolve(summarizeStatus(parseStatusOutput(stdout)));
      },
    );
  });
}
