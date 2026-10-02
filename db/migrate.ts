/**
 * Applies the versioned SQL migrations in db/migrations/ to an open
 * database. Shared by `npm run db:migrate` and `npm run db:restore` (which
 * brings an older backup up to the current schema). CLI only.
 *
 * Foreign keys are switched off around the migrator. drizzle-kit rebuilds a
 * table (CREATE __new_x / copy / DROP x / RENAME) to change a CHECK, and its
 * own "PRAGMA foreign_keys=OFF" is a no-op inside the migrator's transaction:
 * the DROP would then fire ON DELETE actions on child rows (e.g. null every
 * modules.lab_id). Integrity is verified with foreign_key_check afterwards.
 */
import type Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { AppDatabase } from "./connection";

export const MIGRATIONS_FOLDER = "db/migrations";

export function applyMigrations(sqlite: Database.Database, db: AppDatabase) {
  sqlite.pragma("foreign_keys = OFF");
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const violations = sqlite.pragma("foreign_key_check") as unknown[];
  if (violations.length > 0) {
    console.error(violations);
    throw new Error(`Migration left ${violations.length} foreign key violation(s)`);
  }
  sqlite.pragma("foreign_keys = ON");
}
