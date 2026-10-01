import type { Metadata } from "next";
import { connection } from "next/server";
import { GlossaryBrowser } from "@/components/glossary-browser";
import { SetupHint } from "@/components/setup-hint";
import { sqlite } from "@/db";
import { getGlossaryPage } from "@/db/queries/content";
import { getCurriculum } from "@/db/queries/curriculum";
import { getDatabaseStatus } from "@/db/status";

export const metadata: Metadata = { title: "Glossário" };

/**
 * Built from the terms each module declares in its front-matter and marks
 * with <GlossaryTerm> (ingested by npm run content:ingest).
 */
export default async function GlossaryPage() {
  await connection();
  const status = getDatabaseStatus(sqlite);
  const entries = status.ok ? getGlossaryPage(getCurriculum()) : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <section className="space-y-2">
        <p className="font-mono text-sm text-primary">$ man glossario</p>
        <h1 className="text-3xl font-semibold tracking-tight">Glossário</h1>
        <p className="max-w-2xl text-muted-foreground">
          Os termos técnicos em inglês usados nos módulos, com a explicação em português. Ele é
          montado automaticamente: cada termo aparece aqui assim que um módulo o apresenta.
        </p>
      </section>

      {entries.length === 0 ? (
        <SetupHint
          title="Glossário vazio"
          description="Nenhum termo no banco ainda. Os termos vêm dos módulos escritos; ingira o conteúdo."
          commands={status.ok ? ["npm run content:ingest"] : ["npm run db:migrate", "npm run db:seed", "npm run content:ingest"]}
        />
      ) : (
        <GlossaryBrowser entries={entries} />
      )}
    </div>
  );
}
