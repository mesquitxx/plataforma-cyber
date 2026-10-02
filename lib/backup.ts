/**
 * Backup rules for the SQLite database (Phase 8). Pure functions, tested
 * with npm test; the file work is done by scripts/db-backup.ts and
 * scripts/db-restore.ts.
 *
 * Names carry the local time of the snapshot, so they sort chronologically:
 *   plataforma-20261001-213005.db           regular backup (rotated)
 *   pre-restore-plataforma-20261001-213005.db  taken right before a restore
 *                                              (never rotated)
 */

export const KEEP_BACKUPS = 10;

export type BackupKind = "regular" | "pre-restore";
export type BackupName = { name: string; kind: BackupKind; takenAt: Date };

const NAME = /^(pre-restore-)?plataforma-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.db$/;

function stamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

export function backupFileName(date: Date, kind: BackupKind = "regular"): string {
  return `${kind === "pre-restore" ? "pre-restore-" : ""}plataforma-${stamp(date)}.db`;
}

export function parseBackupName(name: string): BackupName | null {
  const m = NAME.exec(name);
  if (!m) return null;
  const [, pre, y, mo, d, h, mi, s] = m;
  const takenAt = new Date(+y, +mo - 1, +d, +h, +mi, +s);
  if (Number.isNaN(takenAt.getTime()) || stamp(takenAt) !== `${y}${mo}${d}-${h}${mi}${s}`) return null;
  return { name, kind: pre ? "pre-restore" : "regular", takenAt };
}

/** Backups found in a folder, newest first; other files are ignored. */
export function listBackups(names: string[]): BackupName[] {
  return names
    .map(parseBackupName)
    .filter((b): b is BackupName => b !== null)
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
}

/** Regular backups beyond the newest `keep`; pre-restore ones always stay. */
export function backupsToDelete(names: string[], keep = KEEP_BACKUPS): string[] {
  return listBackups(names)
    .filter((b) => b.kind === "regular")
    .slice(keep)
    .map((b) => b.name);
}

/** True if there is no regular backup newer than `hours` before `now`. */
export function isBackupDue(names: string[], now: Date, hours: number): boolean {
  const latest = listBackups(names).find((b) => b.kind === "regular");
  return !latest || now.getTime() - latest.takenAt.getTime() >= hours * 3600_000;
}

/**
 * Can a backup with these applied migrations (`created_at` of
 * __drizzle_migrations, i.e. the journal's `when`) be restored by this code?
 * - "same": identical schema;
 * - "older": a prefix of the code's migrations (db:migrate brings it up);
 * - "newer": made by a newer version of the code (refuse);
 * - "diverged": a different history (refuse).
 */
export type MigrationCompat = "same" | "older" | "newer" | "diverged";

export function migrationCompat(backup: number[], code: number[]): MigrationCompat {
  const b = [...backup].sort((x, y) => x - y);
  const c = [...code].sort((x, y) => x - y);
  const shared = Math.min(b.length, c.length);
  for (let i = 0; i < shared; i++) if (b[i] !== c[i]) return "diverged";
  if (b.length === c.length) return "same";
  return b.length < c.length ? "older" : "newer";
}
