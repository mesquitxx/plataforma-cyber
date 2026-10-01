import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ModuleRow } from "@/components/module-row";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Pager } from "@/components/pager";
import { ProgressMeter } from "@/components/progress-meter";
import { getCurriculum } from "@/db/queries/curriculum";
import { findTrack } from "@/lib/curriculum-state";

export async function generateMetadata({
  params,
}: PageProps<"/trilhas/[trackSlug]">): Promise<Metadata> {
  await connection();
  const track = findTrack(getCurriculum(), (await params).trackSlug);
  return { title: track ? `Trilha ${track.number}: ${track.title}` : "Trilha não encontrada" };
}

export default async function TrackPage({ params }: PageProps<"/trilhas/[trackSlug]">) {
  await connection();
  const { trackSlug } = await params;
  const curriculum = getCurriculum();
  const track = findTrack(curriculum, trackSlug);
  if (!track) notFound();

  const index = curriculum.tracks.indexOf(track);
  const previous = curriculum.tracks[index - 1];
  const next = curriculum.tracks[index + 1];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageBreadcrumb
        items={[{ label: "Trilhas", href: "/trilhas" }, { label: `Trilha ${track.number}` }]}
      />

      <section className="space-y-3">
        <p className="font-mono text-sm text-primary">Trilha {track.number}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{track.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{track.description}</p>
        <ProgressMeter
          summary={track.summary}
          label={`Progresso da Trilha ${track.number}`}
          className="max-w-md"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-sm text-muted-foreground">$ ls {track.slug}/</h2>
        <ol className="space-y-2">
          {track.modules.map((module) => (
            <ModuleRow key={module.slug} module={module} />
          ))}
        </ol>
      </section>

      <Pager
        previous={
          previous ? { href: previous.href, label: `Trilha ${previous.number}: ${previous.title}` } : null
        }
        next={next ? { href: next.href, label: `Trilha ${next.number}: ${next.title}` } : null}
      />
    </div>
  );
}
