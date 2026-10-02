/**
 * Where the build is on the ROADMAP (shown in the sidebar) and which content
 * phase writes each track's modules (shown on modules not written yet).
 * npm test checks both against package.json and ROADMAP.md, so they cannot
 * drift again (Phase 8).
 */

export const APP_PHASE = 8;
export const APP_VERSION = "0.8.0";

/** Content phases (ROADMAP.md): tracks 0–2 → 9, 3–5 → 10, 6–8 → 11. */
export const CONTENT_PHASES: { phase: number; tracks: [number, number] }[] = [
  { phase: 9, tracks: [0, 2] },
  { phase: 10, tracks: [3, 5] },
  { phase: 11, tracks: [6, 8] },
];

export function contentPhaseForTrack(track: number): number | null {
  return CONTENT_PHASES.find(({ tracks: [from, to] }) => track >= from && track <= to)?.phase ?? null;
}
