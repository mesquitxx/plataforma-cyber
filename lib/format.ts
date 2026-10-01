const relativeTime = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "há 2 horas", "ontem", "agora"... */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const elapsed = date.getTime() - now.getTime();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms) return relativeTime.format(Math.round(elapsed / ms), unit);
  }
  return "agora";
}
