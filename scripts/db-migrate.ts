/**
 * Applies the versioned SQL migrations in db/migrations/ to the local
 * SQLite database (creating data/ if needed). Usage: npm run db:migrate
 * The rules (foreign keys off around the migrator) live in db/migrate.ts.
 */
import { openDatabase, resolveDatabasePath } from "../db/connection";
import { applyMigrations } from "../db/migrate";

const filePath = resolveDatabasePath();
const { sqlite, db } = openDatabase(filePath);

try {
  applyMigrations(sqlite, db);
  console.log(`Migrations applied to ${filePath}`);
} finally {
  sqlite.close();
}
