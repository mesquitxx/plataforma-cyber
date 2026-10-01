import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  Award,
  BookCheck,
  CircleCheck,
  CircleX,
  Flag,
  Flame,
  History,
  ListChecks,
  Lock,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { ProgressMeter } from "@/components/progress-meter";
import { SetupHint } from "@/components/setup-hint";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { sqlite } from "@/db";
import { getCurriculum } from "@/db/queries/curriculum";
import { getDashboard } from "@/db/queries/dashboard";
import { getDatabaseStatus } from "@/db/status";
import type { ActivityKind } from "@/lib/dashboard";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Painel" };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const ACTIVITY_META: Record<ActivityKind, { label: string; icon: LucideIcon; className: string }> = {
  flag_correct: { label: "Flag correta", icon: Flag, className: "text-primary" },
  flag_wrong: { label: "Flag errada", icon: CircleX, className: "text-muted-foreground" },
  quiz: { label: "Quiz", icon: ListChecks, className: "text-info" },
  task_done: { label: "Tarefa concluída", icon: CircleCheck, className: "text-primary" },
  module_done: { label: "Módulo concluído", icon: BookCheck, className: "text-primary" },
};

function StatTile({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="size-4 text-info" aria-hidden />
          {label}
        </p>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  await connection();
  const status = getDatabaseStatus(sqlite);
  if (!status.ok) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <SetupHint
          title="Banco sem schema"
          description="O banco local ainda não tem as tabelas. Aplique as migrações e carregue o currículo."
          commands={["npm run db:migrate", "npm run db:seed", "npm run content:ingest"]}
        />
      </div>
    );
  }

  const now = new Date();
  const curriculum = getCurriculum();
  const dashboard = getDashboard(curriculum, now);
  const { summary } = curriculum;
  const unlocked = dashboard.achievements.filter((a) => a.unlockedAt);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section className="space-y-2">
        <p className="font-mono text-sm text-primary">$ cat progresso.log</p>
        <h1 className="text-3xl font-semibold tracking-tight">Painel de progresso</h1>
        <p className="max-w-2xl text-muted-foreground">
          Tudo o que você já fez na plataforma, salvo no banco local: módulos, flags, quizzes,
          sequência de estudo e conquistas.
        </p>
      </section>

      {/* Hero figure + KPI row (stat tiles: the number is the chart). */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso geral</CardTitle>
            <CardDescription>Módulos concluídos em todo o currículo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-6xl font-semibold tracking-tight text-primary">{summary.percent}%</p>
            <ProgressMeter summary={summary} label="Progresso geral" />
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile
            icon={BookCheck}
            label="Módulos"
            value={`${summary.completed}/${summary.total}`}
            hint={summary.inProgress > 0 ? `${summary.inProgress} em andamento` : "nenhum em andamento"}
          />
          <StatTile
            icon={Flag}
            label="Flags"
            value={`${dashboard.flags.solved}/${dashboard.flags.total}`}
            hint={
              dashboard.flags.accuracy === null
                ? "nenhuma tentativa ainda"
                : `${dashboard.flags.attempts} ${dashboard.flags.attempts === 1 ? "tentativa" : "tentativas"} · ${dashboard.flags.accuracy}% de acerto`
            }
          />
          <StatTile
            icon={ListChecks}
            label="Quizzes aprovados"
            value={`${dashboard.quizzes.filter((q) => q.passed).length}/${dashboard.quizzes.length}`}
            hint={`${dashboard.quizzes.reduce((n, q) => n + q.attempts, 0)} tentativas no total`}
          />
          <StatTile
            icon={Flame}
            label="Sequência"
            value={`${dashboard.streak.current} ${dashboard.streak.current === 1 ? "dia" : "dias"}`}
            hint={`recorde: ${dashboard.streak.best} ${dashboard.streak.best === 1 ? "dia" : "dias"} seguidos`}
          />
        </div>
      </section>

      {/* One meter per track: a single hue, values in text. */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm text-muted-foreground">$ ls trilhas/ --progresso</h2>
        <Card>
          <CardContent>
            <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {curriculum.tracks.map((track) => (
                <li key={track.slug} className="space-y-1.5">
                  <Link href={track.href} className="flex items-baseline gap-2 text-sm hover:underline">
                    <span className="font-mono text-xs text-muted-foreground">Trilha {track.number}</span>
                    <span className="truncate font-medium">{track.title}</span>
                  </Link>
                  <ProgressMeter summary={track.summary} label={`Progresso da Trilha ${track.number}`} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-info" aria-hidden />
              Quizzes
            </CardTitle>
            <CardDescription>Melhor nota de cada quiz; a linha marca o mínimo para passar.</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.quizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum quiz ingerido ainda.</p>
            ) : (
              <ul className="space-y-4">
                {dashboard.quizzes.map((quiz) => {
                  const best = quiz.bestScore ?? 0;
                  return (
                    <li key={quiz.quizId} className="space-y-1.5">
                      <Link href={quiz.href} className="block text-sm hover:underline">
                        <span className="font-medium">{quiz.title}</span>
                      </Link>
                      <div className="relative">
                        <Progress
                          value={Math.floor((best / quiz.questions) * 100)}
                          aria-label={`Melhor nota: ${best} de ${quiz.questions}`}
                        />
                        <span
                          aria-hidden
                          className="absolute -top-1 h-3 w-0.5 rounded-full bg-muted-foreground"
                          style={{ left: `${quiz.passPercent}%` }}
                        />
                      </div>
                      <p className="flex justify-between font-mono text-xs text-muted-foreground">
                        <span>
                          {quiz.bestScore === null
                            ? "ainda não respondido"
                            : `melhor: ${quiz.bestScore}/${quiz.questions} · ${quiz.attempts} ${quiz.attempts === 1 ? "tentativa" : "tentativas"}`}
                        </span>
                        {quiz.passed && (
                          <span className="flex items-center gap-1 text-primary">
                            <CircleCheck className="size-3.5" aria-hidden /> aprovado
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-info" aria-hidden />
              Atividade recente
            </CardTitle>
            <CardDescription>Os últimos {dashboard.recent.length || 15} eventos.</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada por aqui ainda. Envie uma flag, faça um quiz ou marque uma tarefa.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {dashboard.recent.map((event, i) => {
                  const meta = ACTIVITY_META[event.kind];
                  return (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <meta.icon className={cn("mt-0.5 size-4 shrink-0", meta.className)} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          <span className="text-muted-foreground">{meta.label}: </span>
                          <Link href={event.href} className="hover:underline">
                            {event.title}
                          </Link>
                          {event.detail && <span className="font-mono"> · {event.detail}</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {event.module} ·{" "}
                          <time dateTime={event.at.toISOString()} title={event.at.toLocaleString("pt-BR")}>
                            {formatRelativeTime(event.at, now)}
                          </time>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Trophy className="size-4" aria-hidden />$ ls conquistas/ · {unlocked.length}/{dashboard.achievements.length}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dashboard.achievements.map((achievement) => {
            const done = achievement.unlockedAt !== null;
            return (
              <li
                key={achievement.id}
                className={cn(
                  "flex gap-3 rounded-lg border px-4 py-3",
                  done ? "border-primary/40 bg-primary/5" : "border-dashed",
                )}
              >
                {done ? (
                  <Award className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 space-y-0.5">
                  <p className={cn("font-medium", !done && "text-muted-foreground")}>{achievement.title}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  <p className={cn("font-mono text-xs", done ? "text-primary" : "text-muted-foreground")}>
                    {done ? `Desbloqueada em ${dateFormat.format(achievement.unlockedAt!)}` : "Bloqueada"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
