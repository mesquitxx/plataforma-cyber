/**
 * Study days and streaks (Phase 5). A study day is any local calendar day
 * (the machine's time zone) with a flag attempt, a quiz attempt or a task or
 * module marked. Pure functions, tested with npm test.
 */

/** Local calendar day, e.g. "2026-10-01". */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** Study days in chronological order, each with its first activity. */
export function studyDays(activity: Date[]): { key: string; first: Date }[] {
  const first = new Map<string, Date>();
  for (const at of activity) {
    const key = dayKey(at);
    const seen = first.get(key);
    if (!seen || at < seen) first.set(key, at);
  }
  return [...first.entries()]
    .map(([key, at]) => ({ key, first: at }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export type Streaks = {
  /** Consecutive days up to today, or up to yesterday if today has no activity yet. */
  current: number;
  best: number;
  /** First moment a run of `length` days was reached, or null. */
  reachedAt: (length: number) => Date | null;
};

export function computeStreaks(activity: Date[], now = new Date()): Streaks {
  const days = studyDays(activity);
  const keys = new Set(days.map((d) => d.key));

  // Length of the run ending at each day, in order.
  const runs: { first: Date; length: number }[] = [];
  days.forEach((day, i) => {
    const continues = i > 0 && days[i - 1].key === previousDayKey(day.key);
    runs.push({ first: day.first, length: continues ? runs[i - 1].length + 1 : 1 });
  });

  let start = dayKey(now);
  if (!keys.has(start)) start = previousDayKey(start);
  let current = 0;
  for (let key = start; keys.has(key); key = previousDayKey(key)) current++;

  return {
    current,
    best: runs.reduce((best, r) => Math.max(best, r.length), 0),
    reachedAt: (length) => runs.find((r) => r.length >= length)?.first ?? null,
  };
}
