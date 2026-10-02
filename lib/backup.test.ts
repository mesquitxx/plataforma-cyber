import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  backupFileName,
  backupsToDelete,
  isBackupDue,
  listBackups,
  migrationCompat,
  parseBackupName,
} from "./backup";

describe("backup names", () => {
  it("round-trips the local time of the snapshot", () => {
    const date = new Date(2026, 9, 1, 21, 30, 5);
    assert.equal(backupFileName(date), "plataforma-20261001-213005.db");
    assert.equal(backupFileName(date, "pre-restore"), "pre-restore-plataforma-20261001-213005.db");
    const parsed = parseBackupName("pre-restore-plataforma-20261001-213005.db");
    assert.equal(parsed?.kind, "pre-restore");
    assert.equal(parsed?.takenAt.getTime(), date.getTime());
  });

  it("ignores other files and impossible dates", () => {
    for (const name of ["plataforma.db", "plataforma.pre-fase8.db", "plataforma-20261301-000000.db",
      "plataforma-20261001-213005.db-wal", "x-plataforma-20261001-213005.db"]) {
      assert.equal(parseBackupName(name), null, name);
    }
  });

  it("lists newest first", () => {
    const names = ["plataforma-20261001-100000.db", "notes.txt", "plataforma-20261002-090000.db"];
    assert.deepEqual(listBackups(names).map((b) => b.name),
      ["plataforma-20261002-090000.db", "plataforma-20261001-100000.db"]);
  });
});

describe("backup rotation", () => {
  const regular = Array.from({ length: 12 }, (_, i) => `plataforma-202610${String(i + 1).padStart(2, "0")}-120000.db`);

  it("keeps the newest regular backups and never the pre-restore ones", () => {
    const names = [...regular, "pre-restore-plataforma-20260901-120000.db"];
    assert.deepEqual(backupsToDelete(names, 10), ["plataforma-20261002-120000.db", "plataforma-20261001-120000.db"]);
    assert.deepEqual(backupsToDelete(regular.slice(0, 3), 10), []);
  });

  it("is due when the newest regular backup is old enough", () => {
    const now = new Date(2026, 9, 2, 12, 0, 0);
    assert.equal(isBackupDue([], now, 24), true);
    assert.equal(isBackupDue(["plataforma-20261001-130000.db"], now, 24), false);
    assert.equal(isBackupDue(["plataforma-20261001-120000.db"], now, 24), true);
    // A pre-restore snapshot does not count as the daily backup.
    assert.equal(isBackupDue(["pre-restore-plataforma-20261002-110000.db"], now, 24), true);
  });
});

describe("migration compatibility", () => {
  const code = [10, 20, 30];
  it("accepts the same or an older schema", () => {
    assert.equal(migrationCompat([30, 10, 20], code), "same");
    assert.equal(migrationCompat([10, 20], code), "older");
    assert.equal(migrationCompat([], code), "older");
  });
  it("refuses a newer or a different history", () => {
    assert.equal(migrationCompat([10, 20, 30, 40], code), "newer");
    assert.equal(migrationCompat([10, 25], code), "diverged");
  });
});
