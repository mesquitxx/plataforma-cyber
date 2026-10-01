/**
 * Applies the versioned SQL migrations in db/migrations/ to the local
 * SQLite database (creating data/ if needed). Usage: npm run db:migrate
 *
 * Foreign keys are switched off around the migrator. drizzle-kit rebuilds a
 * table (CREATE __new_x / copy / DROP x / RENAME) to change a CHECK, and its
 * own "PRAGMA foreign_keys=OFF" is a no-op inside the migrator's transaction:
 * the DROP would then fire ON DELETE actions on child rows (e.g. null every
 * modules.lab_id). Integrity is verified with foreign_key_check afterwards.
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDatabase, resolveDatabasePath } from "../db/connection";

const filePath = resolveDatabasePath();
const { sqlite, db } = openDatabase(filePath);

try {
  sqlite.pragma("foreign_keys = OFF");
  migrate(db, { migrationsFolder: "db/migrations" });
  const violations = sqlite.pragma("foreign_key_check") as unknown[];
  if (violations.length > 0) {
    console.error(violations);
    throw new Error(`Migration left ${violations.length} foreign key violation(s)`);
  }
  sqlite.pragma("foreign_keys = ON");
  console.log(`Migrations applied to ${filePath}`);
} finally {
  sqlite.close();
}
