/**
 * Initial SQLite schema, following docs/MODELO-DE-DADOS.md.
 *
 * Two kinds of tables:
 * - Content: ingested from MDX in content/ (Phase 4). Ingestion must UPSERT by
 *   natural key (slug), never delete-and-recreate, so user state survives.
 * - State: produced by using the platform (progress, flag submissions).
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// "linux-sandbox" is a practice box with no vulnerability and no network,
// not an attack target (see CLAUDE.md, isolation rules).
export const LAB_TARGETS = ["dvwa", "juice-shop", "webgoat", "vulhub", "linux-sandbox"] as const;
export const TASK_TYPES = ["reading", "exercise", "lab_step", "flag"] as const;
export const PROGRESS_STATUS = ["not_started", "in_progress", "completed"] as const;

export type LabTarget = (typeof LAB_TARGETS)[number];
export type TaskType = (typeof TASK_TYPES)[number];
export type ProgressStatus = (typeof PROGRESS_STATUS)[number];

const now = sql`(unixepoch())`;

/** Renders a SQL `IN (...)` list from a constant tuple, for CHECK constraints. */
function sqlInList(values: readonly string[]) {
  return sql.raw(values.map((v) => `'${v}'`).join(", "));
}

// ---------- Content ----------

export const tracks = sqliteTable(
  "tracks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    number: integer("number").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [check("tracks_number_range", sql`${t.number} BETWEEN 0 AND 7`)],
);

export const labs = sqliteTable(
  "labs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    target: text("target", { enum: LAB_TARGETS }).notNull(),
    // Relative to labs/.
    composeDir: text("compose_dir").notNull(),
    // Host ports, always bound to 127.0.0.1 (enforced in Phase 6).
    localPorts: text("local_ports", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default(sql`'[]'`),
    isolationNotes: text("isolation_notes"),
  },
  (t) => [check("labs_target_valid", sql`${t.target} IN (${sqlInList(LAB_TARGETS)})`)],
);

export const modules = sqliteTable(
  "modules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    trackId: integer("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    // Globally unique: prerequisites may cross tracks.
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull(),
    bodyMdx: text("body_mdx").notNull(),
    // "Has a lab" is derived from labId IS NOT NULL.
    labId: integer("lab_id").references(() => labs.id, { onDelete: "set null" }),
  },
  (t) => [index("modules_track_idx").on(t.trackId), index("modules_lab_idx").on(t.labId)],
);

export const modulePrerequisites = sqliteTable(
  "module_prerequisites",
  {
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    requiredModuleId: integer("required_module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.moduleId, t.requiredModuleId] }),
    index("module_prerequisites_required_idx").on(t.requiredModuleId),
    check("module_prerequisites_not_self", sql`${t.moduleId} <> ${t.requiredModuleId}`),
  ],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    prompt: text("prompt"),
    sortOrder: integer("sort_order").notNull(),
    // "Requires a flag" is derived from type = 'flag'.
    type: text("type", { enum: TASK_TYPES }).notNull(),
  },
  (t) => [
    uniqueIndex("tasks_module_slug_uq").on(t.moduleId, t.slug),
    check("tasks_type_valid", sql`${t.type} IN (${sqlInList(TASK_TYPES)})`),
  ],
);

// Invariant "flags only exist for tasks with type = 'flag'" spans two tables,
// so it is enforced by ingestion (Phase 4), not by a CHECK.
export const flags = sqliteTable("flags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id")
    .notNull()
    .unique()
    .references(() => tasks.id, { onDelete: "cascade" }),
  // Never the plaintext answer: "scrypt$N$r$p$<hex>" (lib/flag-hash.ts).
  answerHash: text("answer_hash").notNull(),
  salt: text("salt").notNull(),
  hint: text("hint"),
});

export const glossaryTerms = sqliteTable(
  "glossary_terms",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    term: text("term").notNull(),
    definition: text("definition").notNull(),
    firstModuleId: integer("first_module_id").references(() => modules.id, {
      onDelete: "set null",
    }),
  },
  (t) => [uniqueIndex("glossary_terms_term_ci_uq").on(sql`lower(${t.term})`)],
);

// ---------- User state ----------

export const moduleProgress = sqliteTable(
  "module_progress",
  {
    moduleId: integer("module_id")
      .primaryKey()
      .references(() => modules.id, { onDelete: "cascade" }),
    status: text("status", { enum: PROGRESS_STATUS }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
  },
  (t) => [
    check("module_progress_status_valid", sql`${t.status} IN (${sqlInList(PROGRESS_STATUS)})`),
  ],
);

export const taskProgress = sqliteTable(
  "task_progress",
  {
    taskId: integer("task_id")
      .primaryKey()
      .references(() => tasks.id, { onDelete: "cascade" }),
    status: text("status", { enum: PROGRESS_STATUS }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
  },
  (t) => [
    check("task_progress_status_valid", sql`${t.status} IN (${sqlInList(PROGRESS_STATUS)})`),
  ],
);

export const flagSubmissions = sqliteTable(
  "flag_submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    flagId: integer("flag_id")
      .notNull()
      .references(() => flags.id, { onDelete: "cascade" }),
    // Only wrong attempts keep what was typed (to review mistakes); a correct
    // submission never stores the answer in clear text.
    submittedValue: text("submitted_value"),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp" }).notNull().default(now),
  },
  (t) => [
    index("flag_submissions_flag_idx").on(t.flagId),
    check(
      "flag_submissions_value_only_when_wrong",
      sql`(${t.isCorrect} = 0 AND ${t.submittedValue} IS NOT NULL) OR (${t.isCorrect} = 1 AND ${t.submittedValue} IS NULL)`,
    ),
  ],
);
