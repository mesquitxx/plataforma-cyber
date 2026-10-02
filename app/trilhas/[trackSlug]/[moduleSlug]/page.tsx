import type { Metadata } from "next";
import type { MDXContent } from "mdx/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FileText, Lock } from "lucide-react";
import { FlagInput } from "@/components/content/flag-input";
import { ModuleGlossary } from "@/components/content/glossary-term";
import { Quiz } from "@/components/content/quiz";
import { LabBadge } from "@/components/lab-badge";
import { LabPanel } from "@/components/labs/lab-panel";
import { ModuleStateBadge, ModuleStateIcon } from "@/components/module-state";
import { ModuleTasks } from "@/components/module-tasks";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Pager } from "@/components/pager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCurriculum } from "@/db/queries/curriculum";
import { getModuleTasks } from "@/db/queries/progress";
import { findModule } from "@/lib/curriculum-state";
import { contentPhaseForTrack } from "@/lib/roadmap";

type Props = PageProps<"/trilhas/[trackSlug]/[moduleSlug]">;

/**
 * Module content compiled from content/<track>/<module>/index.mdx, or null
 * if the module has not been written yet. Slugs come from the database
 * (findModule), and the import can only resolve files under content/.
 */
async function loadModuleContent(trackSlug: string, moduleSlug: string): Promise<MDXContent | null> {
  try {
    const mod = await import(`@/content/${trackSlug}/${moduleSlug}/index.mdx`);
    return mod.default as MDXContent;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { trackSlug, moduleSlug } = await params;
  const found = findModule(getCurriculum(), trackSlug, moduleSlug);
  return {
    title: found ? `${found.module.number} ${found.module.title}` : "Módulo não encontrado",
  };
}

export default async function ModulePage({ params }: Props) {
  await connection();
  const { trackSlug, moduleSlug } = await params;
  const found = findModule(getCurriculum(), trackSlug, moduleSlug);
  if (!found) notFound();

  const { track, module, previous, next } = found;
  const Content = await loadModuleContent(track.slug, module.slug);
  const tasks = getModuleTasks(module.slug);
  const tasksDone = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageBreadcrumb
        items={[
          { label: "Trilhas", href: "/trilhas" },
          { label: `Trilha ${track.number}`, href: track.href },
          { label: module.number },
        ]}
      />

      <section className="space-y-3">
        <p className="font-mono text-sm text-primary">
          Módulo {module.number} · {track.title}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{module.title}</h1>
        <div className="flex flex-wrap gap-2">
          <ModuleStateBadge state={module.state} />
          {module.labSlug && <LabBadge slug={module.labSlug} />}
        </div>
        {tasks.length > 0 && (
          <div className="max-w-sm space-y-1.5">
            <Progress
              value={Math.floor((tasksDone / tasks.length) * 100)}
              aria-label={`Tarefas do módulo ${module.number}`}
            />
            <p className="font-mono text-xs text-muted-foreground">
              <a href="#tarefas-do-modulo" className="hover:text-foreground">
                {tasksDone}/{tasks.length} tarefas concluídas
              </a>
            </p>
          </div>
        )}
      </section>

      {/* Soft lock: the page stays readable, with a warning. */}
      {module.state === "locked" && (
        <div
          role="note"
          className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
        >
          <Lock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium text-warning">Pré-requisitos pendentes</p>
            <p className="text-muted-foreground">
              Você pode ler este módulo, mas ele faz mais sentido depois de concluir:{" "}
              {module.pendingPrerequisites.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 && ", "}
                  <Link href={p.href} className="text-foreground underline underline-offset-4">
                    {p.number} {p.title}
                  </Link>
                </span>
              ))}
              .
            </p>
          </div>
        </div>
      )}

      {module.prerequisites.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-sm text-muted-foreground">$ cat pre-requisitos</h2>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {module.prerequisites.map((p) => (
              <li key={p.slug}>
                <Link
                  href={p.href}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
                >
                  <ModuleStateIcon state={p.state} />
                  <span className="font-mono text-xs text-muted-foreground">{p.number}</span>
                  <span className="truncate">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The module's lab, right before the content that uses it. */}
      {module.labSlug && <LabPanel slug={module.labSlug} />}

      {Content ? (
        <article className="prose prose-lab max-w-none">
          <Content
            components={{
              // Bind the module: MDX authors only write <FlagInput task="..." />.
              FlagInput: (props: { task: string }) => <FlagInput {...props} moduleSlug={module.slug} />,
              Quiz: (props: { task: string }) => <Quiz {...props} moduleSlug={module.slug} />,
              ModuleGlossary: () => <ModuleGlossary moduleSlug={module.slug} />,
            }}
          />
        </article>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-info" aria-hidden />
              Conteúdo do módulo
            </CardTitle>
            <CardDescription>
              Aqui vão aparecer a teoria, as tarefas e, quando houver, o laboratório deste módulo.
            </CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-xs text-muted-foreground">
            Este módulo ainda não foi escrito: o conteúdo da Trilha {track.number} chega na Fase{" "}
            {contentPhaseForTrack(track.number) ?? "final"} (veja o ROADMAP).
          </CardContent>
        </Card>
      )}

      <ModuleTasks moduleSlug={module.slug} tasks={tasks} moduleCompleted={module.state === "completed"} />

      <Pager
        previous={previous ? { href: previous.href, label: `${previous.number} ${previous.title}` } : null}
        next={next ? { href: next.href, label: `${next.number} ${next.title}` } : null}
      />
    </div>
  );
}
