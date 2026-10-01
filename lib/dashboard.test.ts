import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flagStats, quizRows, recentActivity, type ActivityEvent } from "./dashboard";

describe("dashboard", () => {
  it("counts solved flags once and computes accuracy", () => {
    assert.deepEqual(flagStats([1, 2, 3], []), { total: 3, solved: 0, attempts: 0, accuracy: null });
    const stats = flagStats(
      [1, 2, 3],
      [
        { flagId: 1, isCorrect: false },
        { flagId: 1, isCorrect: true },
        { flagId: 1, isCorrect: true },
        { flagId: 9, isCorrect: true }, // removed from the content: ignored
      ],
    );
    assert.deepEqual(stats, { total: 3, solved: 1, attempts: 3, accuracy: 66 });
  });

  it("keeps the best quiz score", () => {
    const [row] = quizRows(
      [{ quizId: 1, title: "Quiz", module: "0.3 X", href: "/x", questions: 10, passPercent: 70 }],
      [
        { quizId: 1, score: 6 },
        { quizId: 1, score: 8 },
        { quizId: 2, score: 10 },
      ],
    );
    assert.deepEqual([row.attempts, row.bestScore, row.passed], [2, 8, true]);
  });

  it("lists the most recent events first", () => {
    const event = (title: string, day: number): ActivityEvent => ({
      kind: "flag_wrong",
      at: new Date(2026, 9, day),
      title,
      detail: null,
      module: "0.3",
      href: "/",
    });
    const list = recentActivity([event("a", 1), event("b", 3), event("c", 2), event("d", 3)], 3);
    assert.deepEqual(
      list.map((e) => e.title),
      ["b", "d", "c"],
    );
  });
});
