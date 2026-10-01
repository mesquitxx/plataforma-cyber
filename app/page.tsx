import { Gauge } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { ContinueCard } from "@/components/continue-card";
import { ProgressMeter } from "@/components/progress-meter";
import { SetupHint } from "@/components/setup-hint";
import { TrackCard } from "@/components/track-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sqlite } from "@/db";
import { getCurriculum } from "@/db/queries/curriculum";
import { getDatabaseStatus } from "@/db/status";

export default async function HomePage() {
  // better-sqlite3 is synchronous: opt out of prerendering so the data is
  // read per request, not frozen at build time.
  await connection();
  const status = getDatabaseStatus(sqlite);
  const curriculum = status.ok ? getCurriculum() : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section className="space-y-2">
        <p className="font-mono text-sm text-primary">$ whoami</p>
        <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo ao laboratório</h1>
        <p className="max-w-2xl text-muted-foreground">
          Sua plataforma local para aprender <em>pentest</em> (teste de intrusão: atacar um sistema
          com autorização para encontrar falhas antes de um criminoso), da teoria aos laboratórios
          práticos, tudo isolado no seu computador.
        </p>
      </section>

      {!curriculum ? (
        <SetupHint
          title="Banco sem schema"
          description="O banco local ainda não tem as tabelas. Aplique as migrações e carregue o currículo."
          commands={["npm run db:migrate", "npm run db:seed"]}
        />
      ) : curriculum.tracks.length === 0 ? (
        <SetupHint
          title="Currículo vazio"
          description="O banco existe, mas ainda não tem trilhas. Carregue o currículo de exemplo."
          commands={["npm run db:seed"]}
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <ContinueCard target={curriculum.continueTarget} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gauge className="size-4 text-info" aria-hidden />
                  Progresso geral
                </CardTitle>
                <CardDescription>Módulos concluídos em todo o currículo.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 font-mono text-4xl font-semibold text-primary">
                  {curriculum.summary.percent}%
                </p>
                <ProgressMeter summary={curriculum.summary} label="Progresso geral" />
                <Link
                  href="/painel"
                  className="mt-3 inline-block font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  ver painel e conquistas →
                </Link>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h2 className="font-mono text-sm text-muted-foreground">$ ls trilhas/</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {curriculum.tracks.map((track) => (
                <TrackCard key={track.slug} track={track} />
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="font-mono text-xs text-muted-foreground">
        SQLite {status.ok ? "conectado" : "sem schema"} · {status.tables.length} tabelas ·{" "}
        {status.appliedMigrations} migração(ões) · progresso salvo localmente
      </footer>
    </div>
  );
}
