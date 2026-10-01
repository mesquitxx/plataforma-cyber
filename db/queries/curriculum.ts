/**
 * Loads the curriculum and module progress for the app. The dataset is small
 * (8 tracks, ~50 modules), so it is read whole and shaped in memory by
 * lib/curriculum-state.ts. Server-only, like db/index.ts.
 */
import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { labs, modulePrerequisites, moduleProgress, modules, tracks } from "@/db/schema";
import { buildCurriculumView, type CurriculumView } from "@/lib/curriculum-state";

/** Deduplicated per request (e.g. generateMetadata + page). */
export const getCurriculum = cache((): CurriculumView => {
  return buildCurriculumView({
    tracks: db.select().from(tracks).all(),
    modules: db
      .select({
        id: modules.id,
        trackId: modules.trackId,
        slug: modules.slug,
        title: modules.title,
        sortOrder: modules.sortOrder,
        labId: modules.labId,
      })
      .from(modules)
      .all(),
    prerequisites: db.select().from(modulePrerequisites).all(),
    progress: db.select().from(moduleProgress).all(),
    labs: db.select({ id: labs.id, target: labs.target }).from(labs).all(),
  });
});
