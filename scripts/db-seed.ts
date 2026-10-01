/**
 * Seeds the curriculum (tracks, labs, modules, prerequisites) from
 * db/seed/curriculum.ts, upserting by slug in a single transaction.
 * Usage: npm run db:seed   (content only; never touches user progress)
 *
 * Module bodies are only set on insert, so MDX ingested later (Phase 4) is
 * never overwritten by an empty seed body.
 */
import { inArray, sql } from "drizzle-orm";
import { openDatabase, resolveDatabasePath } from "../db/connection";
import { labs, modulePrerequisites, modules, tracks } from "../db/schema";
import { resolveCurriculum } from "../db/seed/curriculum";

const curriculum = resolveCurriculum();
const filePath = resolveDatabasePath();
const { sqlite, db } = openDatabase(filePath);

try {
  db.transaction((tx) => {
    const trackIds = new Map<string, number>();
    curriculum.tracks.forEach((track, index) => {
      const values = {
        slug: track.slug,
        number: track.number,
        title: track.title,
        description: track.description,
        sortOrder: index + 1,
      };
      const row = tx
        .insert(tracks)
        .values(values)
        .onConflictDoUpdate({ target: tracks.slug, set: values })
        .returning({ id: tracks.id })
        .get();
      trackIds.set(track.slug, row.id);
    });

    const labIds = new Map<string, number>();
    for (const lab of curriculum.labs) {
      const values = {
        slug: lab.slug,
        target: lab.target,
        composeDir: lab.composeDir,
        isolationNotes: lab.isolationNotes,
      };
      const row = tx
        .insert(labs)
        .values(values)
        .onConflictDoUpdate({ target: labs.slug, set: values })
        .returning({ id: labs.id })
        .get();
      labIds.set(lab.slug, row.id);
    }

    const moduleIds = new Map<string, number>();
    for (const entry of curriculum.modules) {
      const values = {
        trackId: trackIds.get(entry.trackSlug)!,
        slug: entry.slug,
        title: entry.title,
        sortOrder: entry.sortOrder,
        labId: entry.labSlug ? labIds.get(entry.labSlug)! : null,
      };
      const row = tx
        .insert(modules)
        .values({ ...values, bodyMdx: "" })
        .onConflictDoUpdate({ target: modules.slug, set: values })
        .returning({ id: modules.id })
        .get();
      moduleIds.set(entry.slug, row.id);
    }

    // Prerequisites are pure content (no user state hangs off them), so each
    // seeded module's set is replaced as a whole.
    const seededIds = [...moduleIds.values()];
    tx.delete(modulePrerequisites).where(inArray(modulePrerequisites.moduleId, seededIds)).run();
    const prerequisiteRows = curriculum.modules.flatMap((module) =>
      module.prerequisites.map((required) => ({
        moduleId: moduleIds.get(module.slug)!,
        requiredModuleId: moduleIds.get(required)!,
      })),
    );
    if (prerequisiteRows.length > 0) tx.insert(modulePrerequisites).values(prerequisiteRows).run();
  });

  const count = (table: typeof tracks | typeof modules | typeof labs | typeof modulePrerequisites) =>
    db.select({ n: sql<number>`count(*)` }).from(table).get()!.n;

  console.log(`Seeded ${filePath}`);
  console.log(
    `Tracks: ${count(tracks)} · Modules: ${count(modules)} · Labs: ${count(labs)} · ` +
      `Prerequisites: ${count(modulePrerequisites)}`,
  );
} finally {
  sqlite.close();
}
