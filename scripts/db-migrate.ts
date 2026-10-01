/**
 * Applies the versioned SQL migrations in db/migrations/ to the local
 * SQLite database (creating data/ if needed). Usage: npm run db:migrate
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDatabase, resolveDatabasePath } from "../db/connection";

const filePath = resolveDatabasePath();
const { sqlite, db } = openDatabase(filePath);

try {
  migrate(db, { migrationsFolder: "db/migrations" });
  console.log(`Migrations applied to ${filePath}`);
} finally {
  sqlite.close();
}
