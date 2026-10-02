/**
 * Restores the SQLite database from a backup (Phase 8). Command line only.
 *
 *   npm run db:restore -- <file> --yes
 *
 * <file> is a path or a name in data/backups/ (see npm run db:backup -- --list).
 * Refuses when:
 * - the platform is running (something answers on 127.0.0.1:3000): stop
 *   `npm run dev` first, or the app would keep the old file open;
 * - the backup fails PRAGMA integrity_check;
 * - the backup comes from a newer version of the code, or from a different
 *   migration history.
 * Before replacing anything it snapshots the current database as
 * data/backups/pre-restore-plataforma-<time>.db (never rotated). The swap is
 * atomic (copy to a temporary file, then rename), the old -wal/-shm files are
 * removed, and the migrations are applied, so an older backup is brought up
 * to the current schema.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import Database from "better-sqlite3";
import { openDatabase, resolveDatabasePath } from "../db/connection";
import { MIGRATIONS_FOLDER, applyMigrations } from "../db/migrate";
import { backupFileName, migrationCompat } from "../lib/backup";
import { LOCAL_BACKUP_DIR, formatCounts, progressCounts, sealSnapshot } from "./backup-paths";

function platformIsRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: 3000 });
    socket.setTimeout(1000);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(false));
  });
}

/** Relative inside the project, absolute outside it. */
function display(file: string): string {
  const relative = path.relative(process.cwd(), file);
  return relative.startsWith("..") ? file : relative;
}

function codeMigrations(): number[] {
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: { when: number }[] };
  return journal.entries.map((e) => e.when);
}

function resolveBackup(arg: string): string {
  for (const candidate of [arg, path.join(LOCAL_BACKUP_DIR, arg)]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.resolve(candidate);
  }
  throw new Error(`Backup not found: ${arg} (list them with: npm run db:backup -- --list)`);
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith("--"));
  if (!fileArg || !args.includes("--yes")) {
    console.error("This replaces the database (progress, attempts and content) with a backup.");
    console.error("The current database is saved first as data/backups/pre-restore-plataforma-<time>.db.");
    console.error("Usage: npm run db:restore -- <backup file> --yes");
    process.exit(1);
  }
  if (await platformIsRunning()) {
    throw new Error("The platform is running on 127.0.0.1:3000: stop `npm run dev` / `npm start` first");
  }

  const backup = resolveBackup(fileArg);
  const check = new Database(backup, { readonly: true, fileMustExist: true });
  let applied: number[];
  try {
    const integrity = check.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error(`The backup fails PRAGMA integrity_check (${integrity})`);
    applied = (check.prepare("SELECT created_at FROM __drizzle_migrations").all() as { created_at: number }[])
      .map((r) => Number(r.created_at));
  } catch (error) {
    throw new Error(`Not a usable platform backup: ${(error as Error).message}`);
  } finally {
    check.close();
  }
  const compat = migrationCompat(applied, codeMigrations());
  if (compat === "newer") throw new Error("The backup comes from a newer version of the code: update the repository first");
  if (compat === "diverged") throw new Error("The backup has a different migration history: refusing to mix them");
  console.log(`Backup ${path.basename(backup)}: integrity ok, schema ${compat} — ${formatCounts(progressCounts(backup))}`);

  const target = resolveDatabasePath();
  if (fs.existsSync(target)) {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    const safety = path.join(LOCAL_BACKUP_DIR, backupFileName(new Date(), "pre-restore"));
    const current = new Database(target, { readonly: true, fileMustExist: true });
    try {
      await current.backup(safety);
    } finally {
      current.close();
    }
    sealSnapshot(safety);
    console.log(`Current database saved as ${display(safety)}`);
  }

  const temporary = `${target}.restore-tmp`;
  fs.copyFileSync(backup, temporary);
  const fd = fs.openSync(temporary, "r");
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  for (const suffix of ["-wal", "-shm"]) fs.rmSync(`${target}${suffix}`, { force: true });
  fs.renameSync(temporary, target);

  const { sqlite, db } = openDatabase(target);
  try {
    applyMigrations(sqlite, db);
  } finally {
    sqlite.close();
  }
  console.log(`Restored into ${display(target)} — ${formatCounts(progressCounts(target))}`);
  if (compat === "older") console.log("Older schema brought up to date. Run `npm run db:seed` and `npm run content:ingest` to refresh the content.");
}

main().catch((error: Error) => {
  console.error(`Restore failed: ${error.message}`);
  process.exit(1);
});
