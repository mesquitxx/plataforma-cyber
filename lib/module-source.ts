/**
 * Module MDX sources (content/trilha-N/<slug>/index.mdx): front-matter
 * parsing and validation, with no database access, so the same checks run
 * in `npm test` and in the ingestion script (scripts/content-ingest.ts).
 *
 * The curriculum seed (db/seed/curriculum.ts) stays the source of truth for
 * title, track, prerequisites and lab; the front-matter repeats them for the
 * author and must match. The front-matter adds what only the module knows:
 * tasks, flag hashes and the glossary terms it introduces.
 */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { TASK_TYPES, type TaskType } from "@/db/schema";
import type { TrackSeed } from "@/db/seed/curriculum";
import { isFlagHash, isFlagSalt } from "./flag-hash";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use kebab-case (a-z, 0-9, -)");
const text = z.string().trim().min(1);

const flagTask = z.strictObject({
  slug,
  title: text,
  type: z.literal("flag"),
  prompt: text.optional(),
  hint: text.optional(),
  flag: z.strictObject({
    hash: z.string().refine(isFlagHash, "not a scrypt hash from `npm run flag:hash`"),
    salt: z.string().refine(isFlagSalt, "not a salt from `npm run flag:hash`"),
  }),
});

export const DEFAULT_PASS_PERCENT = 70;

const quizQuestion = z
  .strictObject({
    question: text,
    options: z.array(text).min(2).max(6),
    /** 0-based index of the right option. */
    answer: z.number().int().min(0),
    explanation: text,
  })
  .superRefine((q, ctx) => {
    if (q.answer >= q.options.length) {
      ctx.addIssue({ code: "custom", path: ["answer"], message: `must be between 0 and ${q.options.length - 1}` });
    }
    if (new Set(q.options).size !== q.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "options must be distinct" });
    }
  });

const quizTask = z.strictObject({
  slug,
  title: text,
  type: z.literal("quiz"),
  prompt: text.optional(),
  passPercent: z.number().int().min(1).max(100).default(DEFAULT_PASS_PERCENT),
  questions: z.array(quizQuestion).min(1),
});

type GradedTaskType = "flag" | "quiz";

const otherTask = z.strictObject({
  slug,
  title: text,
  type: z.enum(
    TASK_TYPES.filter((t): t is Exclude<TaskType, GradedTaskType> => t !== "flag" && t !== "quiz"),
  ),
  prompt: text.optional(),
});

export const frontmatterSchema = z.strictObject({
  slug,
  track: z.string().regex(/^trilha-[0-8]$/),
  title: text,
  prerequisites: z.array(z.string()),
  lab: slug.nullable().default(null),
  glossary: z.array(z.strictObject({ term: text, definition: text })).default([]),
  tasks: z.array(z.discriminatedUnion("type", [flagTask, quizTask, otherTask])).default([]),
});

export type ModuleFrontmatter = z.infer<typeof frontmatterSchema>;
export type ModuleTask = ModuleFrontmatter["tasks"][number];

export type ModuleSource = {
  /** Repository-relative path, e.g. content/trilha-0/terminal-linux/index.mdx. */
  file: string;
  frontmatter: ModuleFrontmatter;
  /** MDX without the front-matter block. */
  body: string;
  /** Task slugs used by <FlagInput task="..."> in the body, in order. */
  flagInputs: string[];
  /** Task slugs used by <Quiz task="..."> in the body, in order. */
  quizRefs: string[];
  /** Every <Quiz ...> tag, with or without task= (inline quizzes are an error). */
  quizTagCount: number;
  /** Terms used by <GlossaryTerm term="..."> in the body (as written). */
  glossaryRefs: string[];
};

/** What the curriculum seed says about a module (unexpanded prerequisites). */
export type CurriculumEntry = {
  slug: string;
  trackSlug: string;
  title: string;
  prerequisites: string[];
  lab: string | null;
};

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
const FLAG_INPUT = /<FlagInput\b[^>]*?\btask="([^"]+)"/g;
const GLOSSARY_TERM = /<GlossaryTerm\b[^>]*?\bterm="([^"]+)"/g;
const QUIZ = /<Quiz\b[^>]*?\btask="([^"]+)"/g;
const QUIZ_TAG = /<Quiz\b/g;

export class ContentError extends Error {
  constructor(
    readonly file: string,
    readonly problems: string[],
  ) {
    super(`${file}:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "ContentError";
  }
}

export function parseModuleSource(file: string, source: string): ModuleSource {
  const match = FRONTMATTER.exec(source);
  if (!match) throw new ContentError(file, ["missing YAML front-matter (--- ... ---) at the top"]);

  let data: unknown;
  try {
    data = parseYaml(match[1]);
  } catch (error) {
    throw new ContentError(file, [`invalid YAML: ${(error as Error).message}`]);
  }
  const result = frontmatterSchema.safeParse(data);
  if (!result.success) {
    throw new ContentError(
      file,
      result.error.issues.map((i) => `front-matter ${i.path.join(".") || "(root)"}: ${i.message}`),
    );
  }

  const body = source.slice(match[0].length);
  return {
    file,
    frontmatter: result.data,
    body,
    flagInputs: [...body.matchAll(FLAG_INPUT)].map((m) => m[1]),
    quizRefs: [...body.matchAll(QUIZ)].map((m) => m[1]),
    quizTagCount: [...body.matchAll(QUIZ_TAG)].length,
    glossaryRefs: [...body.matchAll(GLOSSARY_TERM)].map((m) => m[1]),
  };
}

const termKey = (term: string) => term.trim().toLowerCase();

/** Checks one module against the curriculum and against its own body. */
export function checkModule(source: ModuleSource, curriculum: Map<string, CurriculumEntry>): string[] {
  const problems: string[] = [];
  const fm = source.frontmatter;

  const expectedFile = path.posix.join("content", fm.track, fm.slug, "index.mdx");
  if (source.file !== expectedFile) problems.push(`file should be ${expectedFile}`);

  const entry = curriculum.get(fm.slug);
  if (!entry) {
    problems.push(`slug "${fm.slug}" is not in the curriculum (db/seed/curriculum.ts)`);
  } else {
    if (entry.trackSlug !== fm.track) problems.push(`track should be "${entry.trackSlug}"`);
    if (entry.title !== fm.title) problems.push(`title should be "${entry.title}"`);
    if (entry.lab !== fm.lab) problems.push(`lab should be ${JSON.stringify(entry.lab)}`);
    const want = [...entry.prerequisites].sort();
    const got = [...fm.prerequisites].sort();
    if (want.join(",") !== got.join(",")) {
      problems.push(`prerequisites should be [${want.join(", ")}] (as in the curriculum)`);
    }
  }

  const taskSlugs = new Set<string>();
  for (const task of fm.tasks) {
    if (taskSlugs.has(task.slug)) problems.push(`duplicate task slug "${task.slug}"`);
    taskSlugs.add(task.slug);
  }

  // Each graded task has exactly one component in the body, and vice versa.
  const graded = [
    { type: "flag", tag: "FlagInput", refs: source.flagInputs },
    { type: "quiz", tag: "Quiz", refs: source.quizRefs },
  ] as const;
  for (const { type, tag, refs } of graded) {
    const slugs = new Set(fm.tasks.filter((t) => t.type === type).map((t) => t.slug));
    const used = new Map<string, number>();
    for (const slug of refs) used.set(slug, (used.get(slug) ?? 0) + 1);
    for (const [slug, count] of used) {
      if (!slugs.has(slug)) problems.push(`<${tag} task="${slug}"> has no ${type} task in the front-matter`);
      if (count > 1) problems.push(`<${tag} task="${slug}"> appears ${count} times`);
    }
    for (const slug of slugs) {
      if (!used.has(slug)) problems.push(`${type} task "${slug}" has no <${tag} task="${slug}"> in the body`);
    }
  }
  if (source.quizTagCount > source.quizRefs.length) {
    problems.push(
      '<Quiz> without task="...": quiz questions go in the front-matter as a task with type: quiz',
    );
  }

  const declared = new Set<string>();
  for (const { term } of fm.glossary) {
    if (declared.has(termKey(term))) problems.push(`glossary term "${term}" declared twice`);
    declared.add(termKey(term));
  }
  const referenced = new Set(source.glossaryRefs.map(termKey));
  for (const { term } of fm.glossary) {
    if (!referenced.has(termKey(term))) {
      problems.push(`glossary term "${term}" is never marked with <GlossaryTerm term="${term}">`);
    }
  }

  return problems;
}

/**
 * Checks every module and the rules that span modules: a glossary term is
 * declared by exactly one module (where it first appears), and every
 * <GlossaryTerm> points to a declared term. Throws on the first bad file.
 */
export function checkContent(sources: ModuleSource[], curriculum: Map<string, CurriculumEntry>) {
  const owner = new Map<string, string>();
  const errors: ContentError[] = [];

  for (const source of sources) {
    const problems = checkModule(source, curriculum);
    for (const { term } of source.frontmatter.glossary) {
      const previous = owner.get(termKey(term));
      if (previous && previous !== source.frontmatter.slug) {
        problems.push(`glossary term "${term}" is already declared by module "${previous}"`);
      }
      owner.set(termKey(term), source.frontmatter.slug);
    }
    if (problems.length > 0) errors.push(new ContentError(source.file, problems));
  }

  for (const source of sources) {
    const missing = source.glossaryRefs.filter((term) => !owner.has(termKey(term)));
    if (missing.length > 0) {
      errors.push(
        new ContentError(
          source.file,
          [...new Set(missing)].map((t) => `<GlossaryTerm term="${t}"> is not declared by any module`),
        ),
      );
    }
  }

  if (errors.length > 0) throw new AggregateError(errors, errors.map((e) => e.message).join("\n"));
}

/** Indexes the curriculum seed by module slug, keeping prerequisites unexpanded. */
export function curriculumIndex(tracks: TrackSeed[]): Map<string, CurriculumEntry> {
  return new Map(
    tracks.flatMap((track) =>
      track.modules.map((m): [string, CurriculumEntry] => [
        m.slug,
        {
          slug: m.slug,
          trackSlug: track.slug,
          title: m.title,
          prerequisites: m.prerequisites,
          lab: m.lab ?? null,
        },
      ]),
    ),
  );
}

/** Reads and parses every content/trilha-N/<slug>/index.mdx under rootDir. */
export function loadModuleSources(rootDir: string): ModuleSource[] {
  const contentDir = path.join(rootDir, "content");
  const sources: ModuleSource[] = [];
  for (const track of fs.readdirSync(contentDir, { withFileTypes: true })) {
    if (!track.isDirectory()) continue;
    for (const entry of fs.readdirSync(path.join(contentDir, track.name), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = path.posix.join("content", track.name, entry.name, "index.mdx");
      const absolute = path.join(rootDir, file);
      if (!fs.existsSync(absolute)) continue;
      sources.push(parseModuleSource(file, fs.readFileSync(absolute, "utf8")));
    }
  }
  return sources.sort((a, b) => a.file.localeCompare(b.file));
}
