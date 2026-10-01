import type { Metadata } from "next";
import { connection } from "next/server";
import { SetupHint } from "@/components/setup-hint";
import { TrackCard } from "@/components/track-card";
import { getCurriculum } from "@/db/queries/curriculum";

export const metadata: Metadata = { title: "Trilhas" };

export default async function TracksPage() {
  await connection();
  const curriculum = getCurriculum();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="space-y-2">
        <p className="font-mono text-sm text-primary">$ ls trilhas/</p>
        <h1 className="text-3xl font-semibold tracking-tight">Trilhas de estudo</h1>
        <p className="max-w-2xl text-muted-foreground">
          Oito trilhas, da Pré-Segurança à Consolidação. Cada uma reúne módulos com teoria e, quando
          houver, um laboratório isolado.
        </p>
      </section>

      {curriculum.tracks.length === 0 ? (
        <SetupHint
          title="Currículo vazio"
          description="Ainda não há trilhas no banco. Carregue o currículo de exemplo."
          commands={["npm run db:seed"]}
        />
      ) : (
        <ol className="grid gap-4 md:grid-cols-2">
          {curriculum.tracks.map((track) => (
            <li key={track.slug}>
              <TrackCard track={track} fullDescription />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
