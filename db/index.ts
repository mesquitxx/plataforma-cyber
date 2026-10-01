/**
 * App-side database handle. Server-only: importing it from a client
 * component fails the build, so the database never reaches the browser.
 */
import "server-only";
import type Database from "better-sqlite3";
import { openDatabase, type AppDatabase } from "./connection";

// Reuse a single connection across hot reloads in development.
const globalForDb = globalThis as unknown as {
  __plataformaDb?: { sqlite: Database.Database; db: AppDatabase };
};

const connection = globalForDb.__plataformaDb ?? openDatabase();
if (process.env.NODE_ENV !== "production") globalForDb.__plataformaDb = connection;

export const sqlite = connection.sqlite;
export const db = connection.db;
