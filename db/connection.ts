/**
 * SQLite connection factory shared by the app (via db/index.ts) and the
 * CLI scripts in scripts/. Do not import this from client components.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const DEFAULT_DATABASE_PATH = "data/plataforma.db";

export function resolveDatabasePath(): string {
  // Runtime data file, not a build input: keep it out of output file tracing.
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
  );
}

export function openDatabase(filePath = resolveDatabasePath()) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

export type AppDatabase = ReturnType<typeof openDatabase>["db"];
