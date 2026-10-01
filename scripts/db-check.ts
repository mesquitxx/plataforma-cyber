/**
 * Prints a health report of the local SQLite database and exits non-zero
 * if a table is missing or foreign keys are off. Usage: npm run db:check
 */
import fs from "node:fs";
import { openDatabase, resolveDatabasePath } from "../db/connection";
import { getDatabaseStatus } from "../db/status";

const filePath = resolveDatabasePath();
if (!fs.existsSync(filePath)) {
  console.error(`Database not found at ${filePath}. Run: npm run db:migrate`);
  process.exit(1);
}

const { sqlite } = openDatabase(filePath);
const status = getDatabaseStatus(sqlite);
sqlite.close();

console.log(`Database:           ${filePath}`);
console.log(`SQLite version:     ${status.sqliteVersion}`);
console.log(`Journal mode:       ${status.journalMode}`);
console.log(`Foreign keys:       ${status.foreignKeys ? "ON" : "OFF"}`);
console.log(`Applied migrations: ${status.appliedMigrations}`);
console.log(`Tables (${status.tables.length}):        ${status.tables.join(", ")}`);

if (!status.ok) {
  if (status.missingTables.length > 0) {
    console.error(`Missing tables: ${status.missingTables.join(", ")}`);
  }
  console.error("FAIL");
  process.exit(1);
}
console.log("OK");
