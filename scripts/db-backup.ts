/**
 * Online backup of the SQLite database (Phase 8). Safe while the app runs:
 * it uses SQLite's backup API, which copies a consistent snapshot even in WAL
 * mode. Each copy is checked with PRAGMA integrity_check before it is kept.
 *
 *   npm run db:backup                       snapshot into data/backups/
 *   npm run db:backup -- --windows          ...and copy it to the Windows disk
 *   npm run db:backup -- --if-older-than 24 only if the newest is 24 h old
 *   npm run db:backup -- --list             list the backups (WSL and Windows)
 *
 * `npm run dev` runs it daily (predev, decision D4) with --auto: then it never
 * fails, it only warns, so a backup problem never blocks studying.
 * The newest 10 regular backups are kept in each folder; pre-restore
 * snapshots (made by db:restore) are never deleted automatically.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { resolveDatabasePath } from "../db/connection";
import { backupFileName, backupsToDelete, isBackupDue, listBackups } from "../lib/backup";
import {
  LOCAL_BACKUP_DIR,
  filesIn,
  formatCounts,
  progressCounts,
  sealSnapshot,
  windowsBackupDir,
} from "./backup-paths";

const args = process.argv.slice(2);
const auto = args.includes("--auto");
const toWindows = args.includes("--windows");
const olderIndex = args.indexOf("--if-older-than");
const minAgeHours = olderIndex >= 0 ? Number(args[olderIndex + 1]) : null;

function rotate(dir: string) {
  for (const name of backupsToDelete(filesIn(dir))) fs.rmSync(path.join(dir, name));
}

function listFolder(label: string, dir: string | null) {
  console.log(`${label}: ${dir ?? "(not reachable)"}`);
  if (!dir) return;
  const backups = listBackups(filesIn(dir));
  if (backups.length === 0) console.log("  (no backups)");
  for (const b of backups) {
    const file = path.join(dir, b.name);
    const kb = Math.round(fs.statSync(file).size / 1024);
    let counts: string;
    try {
      counts = formatCounts(progressCounts(file));
    } catch {
      counts = "unreadable";
    }
    console.log(`  ${b.name}  ${kb} KB  ${counts}`);
  }
  // /home/kali + labs/.env backups (scripts/lab.sh backup-home).
  for (const name of filesIn(dir).filter((n) => /^lab-\d{8}-\d{6}$/.test(n)).sort().reverse()) {
    const kb = Math.round(fs.statSync(path.join(dir, name, "kali-home.tar.gz")).size / 1024);
    console.log(`  ${name}/  kali-home.tar.gz ${kb} KB  (scripts/lab.sh restore-home ${name} --yes)`);
  }
}

async function main() {
  if (args.includes("--list")) {
    listFolder("WSL", LOCAL_BACKUP_DIR);
    listFolder("Windows", windowsBackupDir());
    return;
  }
  if (minAgeHours !== null && !(minAgeHours > 0)) throw new Error("--if-older-than needs hours > 0");

  const source = resolveDatabasePath();
  if (!fs.existsSync(source)) {
    console.log(`No database at ${source} yet: nothing to back up.`);
    return;
  }
  const now = new Date();
  if (minAgeHours !== null && !isBackupDue(filesIn(LOCAL_BACKUP_DIR), now, minAgeHours)) {
    if (!auto) console.log(`Newest backup is less than ${minAgeHours} h old: skipped.`);
    return;
  }

  fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
  const name = backupFileName(now);
  const target = path.join(LOCAL_BACKUP_DIR, name);
  // Unique per process: two backups in the same second never share it.
  const partial = `${target}.${process.pid}.partial`;

  const sqlite = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await sqlite.backup(partial);
  } finally {
    sqlite.close();
  }
  const integrity = sealSnapshot(partial);
  if (integrity !== "ok") {
    fs.rmSync(partial, { force: true });
    throw new Error(`The copy failed PRAGMA integrity_check (${integrity}); nothing was kept`);
  }
  fs.renameSync(partial, target);
  rotate(LOCAL_BACKUP_DIR);
  console.log(`Backup: ${path.relative(process.cwd(), target)} — ${formatCounts(progressCounts(target))}`);

  if (toWindows) {
    const dir = windowsBackupDir();
    if (!dir) throw new Error("Windows is not reachable from WSL: the backup stays only in data/backups/");
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(target, path.join(dir, name));
    rotate(dir);
    console.log(`Copied to Windows: ${dir}/${name}`);
  }
}

main().catch((error: Error) => {
  if (auto) {
    // predev: warn, never block `npm run dev`.
    console.warn(`Warning: daily backup failed: ${error.message}`);
    return;
  }
  console.error(`Backup failed: ${error.message}`);
  process.exit(1);
});
