import { createElement, Fragment, type ReactNode } from "react";
import type { Metadata } from "next";
import type { MDXComponents, MDXContent } from "mdx/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { FileText, Lock } from "lucide-react";
import { FlagInput } from "@/components/content/flag-input";
import { ModuleGlossary } from "@/components/content/glossary-term";
import { Quiz } from "@/components/content/quiz";
import { LabBadge } from "@/components/lab-badge";
import { LabPanel } from "@/components/labs/lab-panel";
import type { PartMenuItem } from "@/components/module-part-menu";
import { ModulePartNav } from "@/components/module-part-nav";
import { ModuleStateBadge, ModuleStateIcon } from "@/components/module-state";
import { ModuleTasks } from "@/components/module-tasks";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Pager } from "@/components/pager";
import { ScrollToPartTop } from "@/components/scroll-to-part-top";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCurriculum } from "@/db/queries/curriculum";
import { getModuleTasks } from "@/db/queries/progress";
import { findModule } from "@/lib/curriculum-state";
import {
  mdxTopLevelChildren,
  PART_PARAM,
  partHref,
  resolvePartParam,
  splitContentChildren,
  type ModulePlan,
} from "@/lib/module-pages";
import { loadModulePlan } from "@/lib/module-pages-server";
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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  await connection();
  const { trackSlug, moduleSlug } = await params;
  const found = findModule(getCurriculum(), trackSlug, moduleSlug);
  if (!found) return { title: "Módulo não encontrado" };
  const title = `${found.module.number} ${found.module.title}`;
  const total = loadModulePlan(found.track.slug, found.module.slug)?.parts.length ?? 0;
  if (total < 2) return { title };
  const { part } = resolvePartParam((await searchParams)[PART_PARAM], total);
  return { title: `${title} · parte ${part} de ${total}` };
}

type PaginatedContent = {
  plan: ModulePlan;
  /** 1-based. */
  part: number;
  children: ReactNode[];
};

/**
 * Renders the compiled module and keeps only the blocks of the current part
 * (lib/module-pages.ts). If the module and its pagination plan disagree, the
 * whole module is shown: pagination must never hide content.
 */
function paginate(
  Content: MDXContent,
  components: MDXComponents,
  plan: ModulePlan | null,
  rawPart: string | string[] | undefined,
  moduleHref: string,
): { whole: ReactNode } | PaginatedContent {
  const tree = Content({ components });
  const blocks = mdxTopLevelChildren(tree);
  const split = plan && blocks ? splitContentChildren(blocks, plan) : null;
  if (!plan || !split) {
    console.warn(`[module-pages] ${moduleHref}: content and pagination plan disagree; showing the whole module`);
    return { whole: tree };
  }
  const { part, redirectTo } = resolvePartParam(rawPart, plan.parts.length);
  if (redirectTo !== null) redirect(partHref(moduleHref, redirectTo));
  return { plan, part, children: split[part - 1] };
}

export default async function ModulePage({ params, searchParams }: Props) {
  await connection();
  const { trackSlug, moduleSlug } = await params;
  const query = await searchParams;
  const found = findModule(getCurriculum(), trackSlug, moduleSlug);
  if (!found) notFound();

  const { track, module, previous, next } = found;
  const Content = await loadModuleContent(track.slug, module.slug);
  const tasks = getModuleTasks(module.slug);
  const tasksDone = tasks.filter((t) => t.status === "completed").length;

  const components: MDXComponents = {
    // Bind the module: MDX authors only write <FlagInput task="..." />.
    FlagInput: (props: { task: string }) => <FlagInput {...props} moduleSlug={module.slug} />,
    Quiz: (props: { task: string }) => <Quiz {...props} moduleSlug={module.slug} />,
    ModuleGlossary: () => <ModuleGlossary moduleSlug={module.slug} />,
  };
  const content = Content
    ? paginate(Content, components, loadModulePlan(track.slug, module.slug), query[PART_PARAM], module.href)
    : null;
  const paged = content && "plan" in content ? content : null;
  const currentPart = paged ? paged.plan.parts[paged.part - 1] : null;
  const isFirstPart = !paged || paged.part === 1;

  const partItems: PartMenuItem[] =
    paged?.plan.parts.map((p) => ({
      number: p.number,
      href: partHref(module.href, p.number),
      sectionTitle: p.sectionTitle,
      subtitle: p.subtitle,
      hasTasks: p.tasks.length > 0,
    })) ?? [];
  // Task cards live in one part each: link there (same part: plain anchor).
  const taskHrefs: Record<string, string> = {};
  for (const p of paged?.plan.parts ?? []) {
    for (const slug of p.tasks) {
      taskHrefs[slug] = p.number === paged?.part ? `#tarefa-${slug}` : partHref(module.href, p.number, `tarefa-${slug}`);
    }
  }
  const partNav = (label: string) =>
    paged && paged.plan.parts.length > 1 ? (
      <ModulePartNav parts={partItems} current={paged.part} label={label} />
    ) : null;

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

      {paged && <ScrollToPartTop part={paged.part} />}
      {partNav("Partes do módulo (topo)")}

      {/* Soft lock: the page stays readable, with a warning (first part only). */}
      {isFirstPart && module.state === "locked" && (
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

      {isFirstPart && module.prerequisites.length > 0 && (
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

      {content ? (
        <>
          <article className="prose prose-lab max-w-none">
            {paged ? (
              <>
                {/* A split section repeats its title (page chrome, not module content). */}
                {currentPart?.continuation && (
                  <h2>
                    {currentPart.sectionTitle}{" "}
                    <span className="text-base font-normal text-muted-foreground">(continuação)</span>
                  </h2>
                )}
                {/* Spread as static children: the blocks are the MDX's own, unkeyed. */}
                {createElement(Fragment, null, ...paged.children)}
              </>
            ) : (
              "whole" in content && content.whole
            )}
          </article>
          {partNav("Partes do módulo (fim)")}
        </>
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

      <ModuleTasks
        moduleSlug={module.slug}
        tasks={tasks}
        moduleCompleted={module.state === "completed"}
        taskHrefs={taskHrefs}
      />

      <Pager
        previous={previous ? { href: previous.href, label: `${previous.number} ${previous.title}` } : null}
        next={next ? { href: next.href, label: `${next.number} ${next.title}` } : null}
      />
    </div>
  );
}
