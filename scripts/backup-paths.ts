/**
 * Where database backups live (Phase 8, decision D2 in docs/MANUTENCAO.md):
 * - data/backups/ inside WSL (git-ignored, like the database itself);
 * - a copy on the Windows disk, so losing or compacting the WSL virtual disk
 *   never loses progress: <Documents>\plataforma-cyber-backups\ by default
 *   (C:\Users\mesqa\Documents\... on MESQUITA's PC), or BACKUP_WINDOWS_DIR
 *   (a WSL path, e.g. /mnt/d/backups) if set.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export const LOCAL_BACKUP_DIR = path.resolve("data/backups");
const WINDOWS_FOLDER_NAME = "plataforma-cyber-backups";

/** The Windows backup folder as a WSL path, or null if Windows is not reachable. */
export function windowsBackupDir(): string | null {
  if (process.env.BACKUP_WINDOWS_DIR) return process.env.BACKUP_WINDOWS_DIR;
  try {
    const documents = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", "[Environment]::GetFolderPath('MyDocuments')"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 20_000 },
    ).trim();
    if (!documents) return null;
    const wslPath = execFileSync("wslpath", ["-u", documents], { encoding: "utf8" }).trim();
    return path.join(wslPath, WINDOWS_FOLDER_NAME);
  } catch {
    return null;
  }
}

/**
 * Turns a fresh snapshot into a single self-contained file and checks it.
 * The backup API copies the WAL flag, and opening a WAL database (even read
 * only) leaves -wal/-shm files next to it; DELETE mode does not. The app turns
 * WAL back on when it opens a restored database (db/connection.ts).
 * Returns PRAGMA integrity_check ("ok" when healthy).
 */
export function sealSnapshot(file: string): string {
  const sqlite = new Database(file, { fileMustExist: true });
  try {
    sqlite.pragma("journal_mode = DELETE");
    return String(sqlite.pragma("integrity_check", { simple: true }));
  } finally {
    sqlite.close();
  }
}

const STATE_TABLES = ["module_progress", "task_progress", "flag_submissions", "quiz_attempts"];

/**
 * Rows of user state in a database file (what a backup must preserve).
 * Older backups may predate a table (quiz_attempts came in Phase 5): null.
 */
export function progressCounts(file: string): Record<string, number | null> {
  const sqlite = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const exists = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
    return Object.fromEntries(
      STATE_TABLES.map((table) => [
        table,
        exists.get(table)
          ? (sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n
          : null,
      ]),
    );
  } finally {
    sqlite.close();
  }
}

export function formatCounts(counts: Record<string, number | null>): string {
  return Object.entries(counts).map(([table, n]) => `${table} ${n ?? "—"}`).join(" · ");
}

export function filesIn(dir: string): string[] {
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
}
