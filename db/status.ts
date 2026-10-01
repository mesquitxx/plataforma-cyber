/**
 * Health snapshot of the SQLite database, shared by the home page and
 * scripts/db-check.ts.
 */
import type Database from "better-sqlite3";

export const EXPECTED_TABLES = [
  "flag_submissions",
  "flags",
  "glossary_term_mentions",
  "glossary_terms",
  "labs",
  "module_prerequisites",
  "module_progress",
  "modules",
  "quiz_attempts",
  "quiz_questions",
  "quizzes",
  "task_progress",
  "tasks",
  "tracks",
] as const;

export type DatabaseStatus = {
  sqliteVersion: string;
  journalMode: string;
  foreignKeys: boolean;
  tables: string[];
  missingTables: string[];
  appliedMigrations: number;
  ok: boolean;
};

export function getDatabaseStatus(sqlite: Database.Database): DatabaseStatus {
  const sqliteVersion = (sqlite.prepare("SELECT sqlite_version() AS v").get() as { v: string }).v;
  const journalMode = sqlite.pragma("journal_mode", { simple: true }) as string;
  const foreignKeys = sqlite.pragma("foreign_keys", { simple: true }) === 1;

  const tables = (
    sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((row) => row.name);

  const missingTables = EXPECTED_TABLES.filter((name) => !tables.includes(name));

  const hasMigrationsTable = sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'")
    .get();
  const appliedMigrations = hasMigrationsTable
    ? (sqlite.prepare("SELECT count(*) AS n FROM __drizzle_migrations").get() as { n: number }).n
    : 0;

  return {
    sqliteVersion,
    journalMode,
    foreignKeys,
    tables,
    missingTables,
    appliedMigrations,
    ok: foreignKeys && missingTables.length === 0,
  };
}
