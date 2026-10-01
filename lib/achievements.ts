/**
 * Achievements (Phase 5): derived from the user state on every request,
 * never stored, so they cannot drift from the progress they reward. Each
 * comes with the moment it was unlocked, or null. Rules: docs/MODELO-DE-
 * DADOS.md, "Decisões da Fase 5". Pure functions, tested with npm test.
 */
import type { Streaks } from "./activity";

export type AchievementInput = {
  /** Every module; completedAt is set when (and only when) it is completed. */
  modules: { trackNumber: number; completedAt: Date | null }[];
  /** All flag attempts; id breaks ties between attempts in the same second. */
  flagSubmissions: { id: number; flagId: number; isCorrect: boolean; submittedAt: Date }[];
  quizAttempts: { score: number; total: number; submittedAt: Date }[];
  streaks: Pick<Streaks, "reachedAt">;
};

export type Achievement = {
  id: string;
  title: string;
  /** The condition, always visible (no secret achievements). */
  description: string;
  unlockedAt: Date | null;
};

const TRACK_ACHIEVEMENTS = [
  "Fundação sólida",
  "Hacker ético",
  "Kit montado",
  "Caçador web",
  "Mestre dos serviços",
  "Root",
  "Domain Admin",
  "Pentester",
];

const earliest = (dates: (Date | null)[]) =>
  dates.reduce<Date | null>((min, d) => (d && (!min || d < min) ? d : min), null);

/** The n-th (1-based) earliest date, or null if there are fewer than n. */
const nth = (dates: Date[], n: number) =>
  n > 0 ? ([...dates].sort((a, b) => a.getTime() - b.getTime())[n - 1] ?? null) : null;

/** Per flag: when it was first solved and how many wrong attempts came before. */
function flagSolves(submissions: AchievementInput["flagSubmissions"]) {
  const byFlag = new Map<number, AchievementInput["flagSubmissions"]>();
  for (const s of submissions) byFlag.set(s.flagId, [...(byFlag.get(s.flagId) ?? []), s]);
  const solves: { solvedAt: Date; wrongBefore: number }[] = [];
  for (const attempts of byFlag.values()) {
    attempts.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime() || a.id - b.id);
    const index = attempts.findIndex((a) => a.isCorrect);
    if (index !== -1) solves.push({ solvedAt: attempts[index].submittedAt, wrongBefore: index });
  }
  return solves;
}

export function computeAchievements(input: AchievementInput): Achievement[] {
  const completions = input.modules.flatMap((m) => (m.completedAt ? [m.completedAt] : []));
  const total = input.modules.length;
  const solves = flagSolves(input.flagSubmissions);
  const solvedAt = solves.map((s) => s.solvedAt);
  const allDoneAt = (modules: AchievementInput["modules"]) =>
    modules.length > 0 && modules.every((m) => m.completedAt)
      ? modules.reduce((max, m) => (m.completedAt! > max ? m.completedAt! : max), modules[0].completedAt!)
      : null;

  return [
    {
      id: "primeiro-passo",
      title: "Primeiro passo",
      description: "Concluir o primeiro módulo.",
      unlockedAt: nth(completions, 1),
    },
    {
      id: "captura-de-bandeira",
      title: "Captura de bandeira",
      description: "Acertar a primeira flag.",
      unlockedAt: nth(solvedAt, 1),
    },
    {
      id: "de-primeira",
      title: "De primeira",
      description: "Acertar uma flag sem nenhuma tentativa errada antes.",
      unlockedAt: earliest(solves.filter((s) => s.wrongBefore === 0).map((s) => s.solvedAt)),
    },
    {
      id: "persistente",
      title: "Persistente",
      description: "Acertar uma flag depois de 5 ou mais tentativas erradas.",
      unlockedAt: earliest(solves.filter((s) => s.wrongBefore >= 5).map((s) => s.solvedAt)),
    },
    {
      id: "dez-bandeiras",
      title: "Dez bandeiras",
      description: "Acertar 10 flags.",
      unlockedAt: nth(solvedAt, 10),
    },
    {
      id: "nota-maxima",
      title: "Nota máxima",
      description: "Acertar 100% de um quiz.",
      unlockedAt: earliest(input.quizAttempts.filter((a) => a.score === a.total).map((a) => a.submittedAt)),
    },
    {
      id: "constancia",
      title: "Constância",
      description: "Estudar em 3 dias seguidos.",
      unlockedAt: input.streaks.reachedAt(3),
    },
    {
      id: "habito",
      title: "Hábito",
      description: "Estudar em 7 dias seguidos.",
      unlockedAt: input.streaks.reachedAt(7),
    },
    {
      id: "metade-do-caminho",
      title: "Metade do caminho",
      description: "Concluir 50% dos módulos.",
      unlockedAt: nth(completions, Math.ceil(total / 2)),
    },
    ...TRACK_ACHIEVEMENTS.map((title, number) => ({
      id: `trilha-${number}`,
      title,
      description: `Concluir todos os módulos da Trilha ${number}.`,
      unlockedAt: allDoneAt(input.modules.filter((m) => m.trackNumber === number)),
    })),
    {
      id: "zerou",
      title: "Zerou",
      description: "Concluir 100% dos módulos.",
      unlockedAt: allDoneAt(input.modules),
    },
  ];
}
