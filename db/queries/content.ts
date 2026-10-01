/**
 * Reads ingested module content (tasks, flags, glossary) for the content
 * components rendered inside module MDX. Server-only: flag hashes and salts
 * never leave the server.
 */
import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { flagSubmissions, flags, glossaryTerms, modules, tasks } from "@/db/schema";

export type FlagTaskView = {
  title: string;
  prompt: string | null;
  hint: string | null;
  solved: boolean;
  wrongAttempts: number;
};

/** Public view of a flag task; null when the task was not ingested. */
export function getFlagTask(moduleSlug: string, taskSlug: string): FlagTaskView | null {
  const row = db
    .select({
      title: tasks.title,
      prompt: tasks.prompt,
      hint: flags.hint,
      solved: sql<number>`coalesce(max(${flagSubmissions.isCorrect}), 0)`,
      wrongAttempts: sql<number>`count(${flagSubmissions.id}) - coalesce(sum(${flagSubmissions.isCorrect}), 0)`,
    })
    .from(tasks)
    .innerJoin(modules, eq(modules.id, tasks.moduleId))
    .innerJoin(flags, eq(flags.taskId, tasks.id))
    .leftJoin(flagSubmissions, eq(flagSubmissions.flagId, flags.id))
    .where(and(eq(modules.slug, moduleSlug), eq(tasks.slug, taskSlug), eq(tasks.type, "flag")))
    .groupBy(tasks.id)
    .get();
  if (!row) return null;
  return { ...row, solved: row.solved === 1 };
}

/** Everything needed to check a submission; for the Server Action only. */
export function getFlagSecret(moduleSlug: string, taskSlug: string) {
  return (
    db
      .select({ flagId: flags.id, answerHash: flags.answerHash, salt: flags.salt })
      .from(flags)
      .innerJoin(tasks, eq(tasks.id, flags.taskId))
      .innerJoin(modules, eq(modules.id, tasks.moduleId))
      .where(and(eq(modules.slug, moduleSlug), eq(tasks.slug, taskSlug)))
      .get() ?? null
  );
}

export function recordFlagSubmission(flagId: number, value: string, isCorrect: boolean) {
  // Only wrong attempts keep the typed value (CHECK constraint in the schema).
  db.insert(flagSubmissions)
    .values({ flagId, isCorrect, submittedValue: isCorrect ? null : value })
    .run();
}

export type GlossaryEntry = { term: string; definition: string };

/** Whole glossary keyed by lower-case term; deduplicated per request. */
export const getGlossary = cache((): Map<string, GlossaryEntry> => {
  const rows = db
    .select({ term: glossaryTerms.term, definition: glossaryTerms.definition })
    .from(glossaryTerms)
    .all();
  return new Map(rows.map((row) => [row.term.toLowerCase(), row]));
});

/** Terms first introduced by a module, alphabetically. */
export function getModuleGlossary(moduleSlug: string): GlossaryEntry[] {
  return db
    .select({ term: glossaryTerms.term, definition: glossaryTerms.definition })
    .from(glossaryTerms)
    .innerJoin(modules, eq(modules.id, glossaryTerms.firstModuleId))
    .where(eq(modules.slug, moduleSlug))
    .orderBy(asc(sql`lower(${glossaryTerms.term})`))
    .all();
}
