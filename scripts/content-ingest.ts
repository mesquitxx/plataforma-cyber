/**
 * Ingests the module MDX files in content/ into the database, in a single
 * transaction. Usage: npm run content:ingest   (after db:migrate and db:seed)
 *
 * - Validates every file first (lib/module-source.ts); nothing is written if
 *   any file is invalid.
 * - Modules must already exist (the curriculum seed creates them); ingestion
 *   fills body_mdx and upserts tasks, flags and glossary terms by natural key.
 * - User state survives: progress and flag submissions hang off ids that are
 *   kept. Only tasks/flags/terms removed from a module's front-matter are
 *   deleted (their progress and submissions go with them, by design).
 */
import { and, eq, notInArray, sql } from "drizzle-orm";
import { openDatabase, resolveDatabasePath } from "../db/connection";
import { flags, glossaryTerms, modules, tasks } from "../db/schema";
import { TRACKS } from "../db/seed/curriculum";
import { checkContent, curriculumIndex, loadModuleSources } from "../lib/module-source";

const sources = loadModuleSources(process.cwd());
try {
  checkContent(sources, curriculumIndex(TRACKS));
} catch (error) {
  const errors = error instanceof AggregateError ? error.errors : [error];
  console.error("Invalid content; nothing was written:\n");
  for (const e of errors) console.error(`${(e as Error).message}\n`);
  process.exit(1);
}

const filePath = resolveDatabasePath();
const { sqlite, db } = openDatabase(filePath);

try {
  const totals = { modules: 0, tasks: 0, flags: 0, terms: 0 };

  db.transaction((tx) => {
    for (const source of sources) {
      const fm = source.frontmatter;
      const moduleRow = tx.select({ id: modules.id }).from(modules).where(eq(modules.slug, fm.slug)).get();
      if (!moduleRow) throw new Error(`Module "${fm.slug}" is not in the database: run npm run db:seed`);

      tx.update(modules).set({ bodyMdx: source.body }).where(eq(modules.id, moduleRow.id)).run();
      totals.modules++;

      // Tasks, upserted by (module, slug).
      const keptTaskSlugs = fm.tasks.map((t) => t.slug);
      tx.delete(tasks)
        .where(
          keptTaskSlugs.length > 0
            ? and(eq(tasks.moduleId, moduleRow.id), notInArray(tasks.slug, keptTaskSlugs))
            : eq(tasks.moduleId, moduleRow.id),
        )
        .run();

      fm.tasks.forEach((task, index) => {
        const values = {
          moduleId: moduleRow.id,
          slug: task.slug,
          title: task.title,
          prompt: task.prompt ?? null,
          sortOrder: index + 1,
          type: task.type,
        };
        const row = tx
          .insert(tasks)
          .values(values)
          .onConflictDoUpdate({ target: [tasks.moduleId, tasks.slug], set: values })
          .returning({ id: tasks.id })
          .get();
        totals.tasks++;

        if (task.type === "flag") {
          const flagValues = {
            taskId: row.id,
            answerHash: task.flag.hash,
            salt: task.flag.salt,
            hint: task.hint ?? null,
          };
          tx.insert(flags)
            .values(flagValues)
            .onConflictDoUpdate({ target: flags.taskId, set: flagValues })
            .run();
          totals.flags++;
        } else {
          // A task that stopped being a flag keeps no flag row.
          tx.delete(flags).where(eq(flags.taskId, row.id)).run();
        }
      });

      // Glossary terms introduced by this module, matched case-insensitively.
      const keptTerms = fm.glossary.map((g) => g.term.toLowerCase());
      tx.delete(glossaryTerms)
        .where(
          keptTerms.length > 0
            ? and(
                eq(glossaryTerms.firstModuleId, moduleRow.id),
                notInArray(sql`lower(${glossaryTerms.term})`, keptTerms),
              )
            : eq(glossaryTerms.firstModuleId, moduleRow.id),
        )
        .run();

      for (const { term, definition } of fm.glossary) {
        const existing = tx
          .select({ id: glossaryTerms.id })
          .from(glossaryTerms)
          .where(eq(sql`lower(${glossaryTerms.term})`, term.toLowerCase()))
          .get();
        const values = { term, definition, firstModuleId: moduleRow.id };
        if (existing) {
          tx.update(glossaryTerms).set(values).where(eq(glossaryTerms.id, existing.id)).run();
        } else {
          tx.insert(glossaryTerms).values(values).run();
        }
        totals.terms++;
      }
    }
  });

  console.log(`Ingested ${filePath}`);
  console.log(
    `Modules: ${totals.modules} · Tasks: ${totals.tasks} · Flags: ${totals.flags} · ` +
      `Glossary terms: ${totals.terms}`,
  );
} finally {
  sqlite.close();
}
