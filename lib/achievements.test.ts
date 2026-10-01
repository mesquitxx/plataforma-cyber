import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeAchievements, type AchievementInput } from "./achievements";
import { computeStreaks, dayKey } from "./activity";

/** Local date: day of October 2026 at the given hour. */
const oct = (day: number, hour = 12) => new Date(2026, 9, day, hour);

describe("study days and streaks", () => {
  it("uses local calendar days", () => {
    assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  });

  it("counts the current run up to today or yesterday, and the best run", () => {
    const activity = [oct(1), oct(2), oct(2, 20), oct(3), oct(6), oct(7)];
    const today = computeStreaks(activity, oct(7, 22));
    assert.equal(today.current, 2);
    assert.equal(today.best, 3);
    // No activity yet today: yesterday's run still counts.
    assert.equal(computeStreaks(activity, oct(8)).current, 2);
    // A whole day missed: the run is broken.
    assert.equal(computeStreaks(activity, oct(9)).current, 0);
    assert.deepEqual(today.reachedAt(3), oct(3));
    assert.equal(today.reachedAt(7), null);
  });

  it("crosses month boundaries", () => {
    const run = [new Date(2026, 8, 30, 10), oct(1), oct(2)];
    assert.equal(computeStreaks(run, oct(2)).best, 3);
  });
});

describe("achievements", () => {
  const none: AchievementInput = {
    modules: [
      { trackNumber: 0, completedAt: null },
      { trackNumber: 0, completedAt: null },
      { trackNumber: 1, completedAt: null },
    ],
    flagSubmissions: [],
    quizAttempts: [],
    streaks: { reachedAt: () => null },
  };
  const unlocked = (input: AchievementInput) =>
    Object.fromEntries(computeAchievements(input).map((a) => [a.id, a.unlockedAt]));

  it("starts with everything locked, with one per track", () => {
    const list = computeAchievements(none);
    assert.equal(list.length, 18);
    assert.ok(list.every((a) => a.unlockedAt === null));
    assert.equal(list.filter((a) => a.id.startsWith("trilha-")).length, 8);
  });

  it("dates module and track achievements", () => {
    const result = unlocked({
      ...none,
      modules: [
        { trackNumber: 0, completedAt: oct(2) },
        { trackNumber: 0, completedAt: oct(5) },
        { trackNumber: 1, completedAt: null },
      ],
    });
    assert.deepEqual(result["primeiro-passo"], oct(2));
    assert.deepEqual(result["metade-do-caminho"], oct(5)); // 2 of 3 >= 50%
    assert.deepEqual(result["trilha-0"], oct(5));
    assert.equal(result["trilha-1"], null);
    assert.equal(result["trilha-7"], null); // a track with no modules is never done
    assert.equal(result["zerou"], null);
  });

  it("tells first-try and persistent flags apart, by attempt order", () => {
    const wrong = (id: number, flagId: number, day: number) => ({ id, flagId, isCorrect: false, submittedAt: oct(day) });
    const right = (id: number, flagId: number, day: number) => ({ id, flagId, isCorrect: true, submittedAt: oct(day) });
    const result = unlocked({
      ...none,
      flagSubmissions: [
        ...[1, 2, 3, 4, 5].map((id) => wrong(id, 1, 3)),
        right(6, 1, 3), // same second as the wrong ones: id decides the order
        right(7, 2, 4),
        right(8, 2, 6), // re-solving does not count twice
      ],
    });
    assert.deepEqual(result["captura-de-bandeira"], oct(3));
    assert.deepEqual(result["persistente"], oct(3));
    assert.deepEqual(result["de-primeira"], oct(4));
    assert.equal(result["dez-bandeiras"], null);
  });

  it("rewards a perfect quiz and streaks", () => {
    const result = unlocked({
      ...none,
      quizAttempts: [
        { score: 9, total: 10, submittedAt: oct(1) },
        { score: 10, total: 10, submittedAt: oct(2) },
      ],
      streaks: { reachedAt: (n) => (n === 3 ? oct(3) : null) },
    });
    assert.deepEqual(result["nota-maxima"], oct(2));
    assert.deepEqual(result["constancia"], oct(3));
    assert.equal(result["habito"], null);
  });
});
