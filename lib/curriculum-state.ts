/**
 * Pure curriculum logic (no database): derives each module's display state,
 * progress summaries and the "continue where I left off" target from a raw
 * snapshot of the tables. Rules: docs/MODELO-DE-DADOS.md, "Decisões de
 * navegação (Fase 3)".
 */
import type { ProgressStatus } from "@/db/schema";

// ---------- Input: raw rows ----------

export type CurriculumSnapshot = {
  tracks: { id: number; slug: string; number: number; title: string; description: string; sortOrder: number }[];
  modules: { id: number; trackId: number; slug: string; title: string; sortOrder: number; labId: number | null }[];
  prerequisites: { moduleId: number; requiredModuleId: number }[];
  progress: { moduleId: number; status: ProgressStatus; updatedAt: Date }[];
  labs: { id: number; slug: string }[];
};

// ---------- Output: view model ----------

/** Display state. "locked" and "available" are derived, never stored. */
export type ModuleState = "completed" | "in_progress" | "available" | "locked";

export type ProgressSummary = {
  total: number;
  completed: number;
  inProgress: number;
  /** Completed share, 0–100, rounded down (100 only when all are done). */
  percent: number;
};

export type ModuleRef = {
  slug: string;
  title: string;
  /** Display number, e.g. "1.4". */
  number: string;
  href: string;
  state: ModuleState;
};

export type ModuleView = ModuleRef & {
  id: number;
  trackSlug: string;
  /** Slug in lib/labs/catalog.ts, or null when the module has no lab. */
  labSlug: string | null;
  updatedAt: Date | null;
  prerequisites: ModuleRef[];
  /** Prerequisites not completed yet; non-empty exactly when the state is "locked". */
  pendingPrerequisites: ModuleRef[];
};

export type TrackView = {
  id: number;
  slug: string;
  number: number;
  title: string;
  description: string;
  href: string;
  modules: ModuleView[];
  summary: ProgressSummary;
};

export type ContinueTarget = {
  module: ModuleView;
  track: TrackView;
  reason: "in_progress" | "next_available";
};

export type CurriculumView = {
  tracks: TrackView[];
  /** Every module in curriculum order (track, then sort order). */
  modules: ModuleView[];
  summary: ProgressSummary;
  continueTarget: ContinueTarget | null;
};

export function trackPath(trackSlug: string): string {
  return `/trilhas/${trackSlug}`;
}

export function modulePath(trackSlug: string, moduleSlug: string): string {
  return `/trilhas/${trackSlug}/${moduleSlug}`;
}

export function formatModuleNumber(trackNumber: number, sortOrder: number): string {
  return `${trackNumber}.${sortOrder}`;
}

/** Recorded progress wins; otherwise any unfinished prerequisite locks the module. */
export function deriveModuleState(
  status: ProgressStatus | undefined,
  prerequisiteStatuses: (ProgressStatus | undefined)[],
): ModuleState {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  return prerequisiteStatuses.every((s) => s === "completed") ? "available" : "locked";
}

export function summarizeProgress(states: ModuleState[]): ProgressSummary {
  const total = states.length;
  const completed = states.filter((s) => s === "completed").length;
  const inProgress = states.filter((s) => s === "in_progress").length;
  const percent = total === 0 ? 0 : Math.floor((completed / total) * 100);
  return { total, completed, inProgress, percent };
}

/** Most recently touched in-progress module; else the first available one. */
export function pickContinueModule(modulesInOrder: ModuleView[]): ModuleView | null {
  let latest: ModuleView | null = null;
  for (const candidate of modulesInOrder) {
    if (candidate.state !== "in_progress") continue;
    if (!latest || (candidate.updatedAt?.getTime() ?? 0) > (latest.updatedAt?.getTime() ?? 0)) {
      latest = candidate;
    }
  }
  return latest ?? modulesInOrder.find((m) => m.state === "available") ?? null;
}

export function buildCurriculumView(snapshot: CurriculumSnapshot): CurriculumView {
  const progressById = new Map(snapshot.progress.map((p) => [p.moduleId, p]));
  const labSlugById = new Map(snapshot.labs.map((lab) => [lab.id, lab.slug]));
  const requiredById = new Map<number, number[]>();
  for (const { moduleId, requiredModuleId } of snapshot.prerequisites) {
    const list = requiredById.get(moduleId) ?? [];
    list.push(requiredModuleId);
    requiredById.set(moduleId, list);
  }

  const sortedTracks = [...snapshot.tracks].sort((a, b) => a.sortOrder - b.sortOrder);
  const trackById = new Map(sortedTracks.map((t) => [t.id, t]));

  // First pass: own state and identity of every module.
  const refById = new Map<number, ModuleRef>();
  for (const row of snapshot.modules) {
    const track = trackById.get(row.trackId);
    if (!track) continue;
    const required = requiredById.get(row.id) ?? [];
    refById.set(row.id, {
      slug: row.slug,
      title: row.title,
      number: formatModuleNumber(track.number, row.sortOrder),
      href: modulePath(track.slug, row.slug),
      state: deriveModuleState(
        progressById.get(row.id)?.status,
        required.map((id) => progressById.get(id)?.status),
      ),
    });
  }

  const byCurriculumOrder = (a: ModuleRef, b: ModuleRef) => compareModuleNumbers(a.number, b.number);

  const tracks: TrackView[] = sortedTracks.map((track) => {
    const modules: ModuleView[] = snapshot.modules
      .filter((m) => m.trackId === track.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((module) => {
        const ref = refById.get(module.id)!;
        const prerequisites = (requiredById.get(module.id) ?? [])
          .map((id) => refById.get(id))
          .filter((r): r is ModuleRef => r !== undefined)
          .sort(byCurriculumOrder);
        return {
          ...ref,
          id: module.id,
          trackSlug: track.slug,
          labSlug: module.labId === null ? null : (labSlugById.get(module.labId) ?? null),
          updatedAt: progressById.get(module.id)?.updatedAt ?? null,
          prerequisites,
          pendingPrerequisites:
            ref.state === "locked" ? prerequisites.filter((p) => p.state !== "completed") : [],
        };
      });
    return {
      id: track.id,
      slug: track.slug,
      number: track.number,
      title: track.title,
      description: track.description,
      href: trackPath(track.slug),
      modules,
      summary: summarizeProgress(modules.map((m) => m.state)),
    };
  });

  const modules = tracks.flatMap((t) => t.modules);
  const next = pickContinueModule(modules);
  const continueTarget: ContinueTarget | null = next
    ? {
        module: next,
        track: tracks.find((t) => t.slug === next.trackSlug)!,
        reason: next.state === "in_progress" ? "in_progress" : "next_available",
      }
    : null;

  return {
    tracks,
    modules,
    summary: summarizeProgress(modules.map((m) => m.state)),
    continueTarget,
  };
}

export function findTrack(curriculum: CurriculumView, trackSlug: string) {
  return curriculum.tracks.find((t) => t.slug === trackSlug) ?? null;
}

/** Null when the module does not exist or belongs to another track. */
export function findModule(curriculum: CurriculumView, trackSlug: string, moduleSlug: string) {
  const track = findTrack(curriculum, trackSlug);
  const index = track?.modules.findIndex((m) => m.slug === moduleSlug) ?? -1;
  if (!track || index === -1) return null;

  const position = curriculum.modules.findIndex((m) => m.id === track.modules[index].id);
  return {
    track,
    module: track.modules[index],
    previous: curriculum.modules[position - 1] ?? null,
    next: curriculum.modules[position + 1] ?? null,
  };
}

function compareModuleNumbers(a: string, b: string): number {
  const [aTrack, aOrder] = a.split(".").map(Number);
  const [bTrack, bOrder] = b.split(".").map(Number);
  return aTrack - bTrack || aOrder - bOrder;
}
