import "server-only";
import fs from "node:fs";
import path from "node:path";
import { planModulePages, type ModulePlan } from "./module-pages";

const cache = new Map<string, { mtimeMs: number; plan: ModulePlan }>();

/**
 * Pagination plan of content/<track>/<module>/index.mdx, or null if the
 * module has not been written. Slugs come from the database (findModule).
 * Cached per file and recomputed when the file changes (next dev).
 */
export function loadModulePlan(trackSlug: string, moduleSlug: string): ModulePlan | null {
  const file = path.join(process.cwd(), "content", trackSlug, moduleSlug, "index.mdx");
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }
  const cached = cache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.plan;
  const plan = planModulePages(fs.readFileSync(file, "utf8"));
  cache.set(file, { mtimeMs: stat.mtimeMs, plan });
  return plan;
}
