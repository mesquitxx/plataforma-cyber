/**
 * Lab status (Phase 6), derived from the output of `scripts/lab.sh status`:
 * one line per Compose container, tab-separated (name, project, service,
 * state, health, lab). Pure functions, tested with npm test. The state always
 * comes from Docker, never from memory, so a restart of the app cannot leave
 * it inconsistent.
 */

export type ContainerRow = {
  name: string;
  project: string;
  service: string;
  /** Docker state: created, running, restarting, exited, paused, dead... */
  state: string;
  /** Healthcheck status, or null when the container has none. */
  health: string | null;
  /** Lab slug, or null for a container that belongs to no known lab. */
  lab: string | null;
};

/** What the interface shows for each lab. */
export type LabRunState = "stopped" | "starting" | "running" | "degraded";

export type LabsStatus = {
  /** Only labs with containers; every other lab is "stopped". */
  states: Record<string, LabRunState>;
  /** Labs with at least one running container (one, under the RAM rule). */
  running: string[];
  /** Running Compose containers that belong to no known lab. */
  foreign: string[];
};

export function parseStatusOutput(output: string): ContainerRow[] {
  return output
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [name, project, service, state, health, lab] = line.split("\t");
      if (lab === undefined) throw new Error(`Unexpected lab status line: ${JSON.stringify(line)}`);
      return {
        name,
        project,
        service,
        state,
        health: health === "-" ? null : health,
        lab: lab === "-" ? null : lab,
      };
    });
}

/**
 * One lab's state from its containers: nothing running is "stopped"; a
 * healthcheck still starting is "starting"; any container down, restarting or
 * unhealthy next to running ones is "degraded".
 */
export function labRunState(rows: ContainerRow[]): LabRunState {
  if (!rows.some((r) => r.state === "running")) return "stopped";
  if (rows.some((r) => r.health === "unhealthy" || ["exited", "dead", "restarting"].includes(r.state))) {
    return "degraded";
  }
  if (rows.some((r) => r.health === "starting" || r.state === "created")) return "starting";
  return "running";
}

export function summarizeStatus(rows: ContainerRow[]): LabsStatus {
  const byLab = new Map<string, ContainerRow[]>();
  for (const row of rows) {
    if (row.lab === null) continue;
    byLab.set(row.lab, [...(byLab.get(row.lab) ?? []), row]);
  }
  const states: Record<string, LabRunState> = {};
  for (const [lab, labRows] of byLab) states[lab] = labRunState(labRows);
  return {
    states,
    running: [...byLab.keys()].filter((lab) => states[lab] !== "stopped").sort(),
    foreign: rows.filter((r) => r.lab === null && r.state === "running").map((r) => r.name),
  };
}

export const RUN_STATE_LABELS: Record<LabRunState, string> = {
  stopped: "parado",
  starting: "subindo",
  running: "rodando",
  degraded: "com problema",
};
