/**
 * Seeds the curriculum (tracks, labs, modules, prerequisites) from
 * db/seed/curriculum.ts, upserting by slug in a single transaction.
 *
 *   npm run db:seed        content only; never touches user progress
 *   npm run db:seed:demo   content + REPLACES progress with demo progress
 *
 * Module bodies are only set on insert, so MDX ingested later (Phase 4) is
 * never overwritten by an empty seed body.
 */
import { eq, inArray, sql } from "drizzle-orm";
import { openDatabase, resolveDatabasePath } from "../db/connection";
import {
  labs,
  modulePrerequisites,
  moduleProgress,
  modules,
  taskProgress,
  tracks,
} from "../db/schema";
import { resolveCurriculum } from "../db/seed/curriculum";
import { DEMO_PROGRESS } from "../db/seed/demo-progress";

const withDemoProgress = process.argv.includes("--demo-progress");

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

    if (withDemoProgress) {
      tx.delete(taskProgress).run();
      tx.delete(moduleProgress).run();
      const now = Date.now();
      tx.insert(moduleProgress)
        .values(
          DEMO_PROGRESS.map((entry) => {
            const moduleId = moduleIds.get(entry.moduleSlug);
            if (moduleId === undefined) {
              throw new Error(`Demo progress references unknown module "${entry.moduleSlug}"`);
            }
            return {
              moduleId,
              status: entry.status,
              updatedAt: new Date(now - entry.hoursAgo * 3_600_000),
            };
          }),
        )
        .run();
    }
  });

  const count = (table: typeof tracks | typeof modules | typeof labs | typeof modulePrerequisites) =>
    db.select({ n: sql<number>`count(*)` }).from(table).get()!.n;
  const completed = db
    .select({ n: sql<number>`count(*)` })
    .from(moduleProgress)
    .where(eq(moduleProgress.status, "completed"))
    .get()!.n;

  console.log(`Seeded ${filePath}`);
  console.log(
    `Tracks: ${count(tracks)} · Modules: ${count(modules)} · Labs: ${count(labs)} · ` +
      `Prerequisites: ${count(modulePrerequisites)}`,
  );
  console.log(
    withDemoProgress
      ? `Demo progress written (${completed} modules completed).`
      : "Progress untouched (use npm run db:seed:demo for demo progress).",
  );
} finally {
  sqlite.close();
}
