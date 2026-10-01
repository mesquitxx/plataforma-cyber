/**
 * Erases ALL user state (module and task progress, flag submissions and quiz
 * attempts), keeping the content. Command line only, never a button in the
 * UI, so it cannot happen by accident. Usage: npm run progress:reset -- --yes
 *
 * Achievements and the dashboard are derived from these tables, so they
 * start over too.
 */
import { sql } from "drizzle-orm";
import { openDatabase, resolveDatabasePath } from "../db/connection";
import { flagSubmissions, moduleProgress, quizAttempts, taskProgress } from "../db/schema";

const STATE_TABLES = [
  ["flag_submissions", flagSubmissions],
  ["quiz_attempts", quizAttempts],
  ["task_progress", taskProgress],
  ["module_progress", moduleProgress],
] as const;

if (!process.argv.includes("--yes")) {
  console.error("This erases all your progress, flag attempts and quiz attempts (content is kept).");
  console.error("To confirm, run: npm run progress:reset -- --yes");
  process.exit(1);
}

const filePath = resolveDatabasePath();
const { sqlite, db } = openDatabase(filePath);

try {
  const removed = db.transaction((tx) =>
    STATE_TABLES.map(([name, table]) => {
      const n = tx.select({ n: sql<number>`count(*)` }).from(table).get()!.n;
      tx.delete(table).run();
      return `${name}: ${n}`;
    }),
  );
  console.log(`Progress reset in ${filePath}`);
  console.log(`Rows removed — ${removed.join(" · ")}`);
} finally {
  sqlite.close();
}
