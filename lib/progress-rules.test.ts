import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gradeQuiz,
  gradedTaskStatus,
  manualModuleStatus,
  manualTaskStatus,
  moduleStatusAfterTaskChange,
  quizPassMark,
  quizPassed,
} from "./progress-rules";

describe("progress rules", () => {
  it("passes a quiz at the pass mark, not below", () => {
    assert.equal(quizPassed(7, 10, 70), true);
    assert.equal(quizPassed(6, 10, 70), false);
    assert.equal(quizPassed(3, 3, 100), true);
    assert.equal(quizPassed(2, 3, 70), false); // 66.6% < 70%
    assert.equal(quizPassed(0, 0, 70), false);
    assert.equal(quizPassMark(10, 70), 7);
    assert.equal(quizPassMark(3, 70), 3);
  });

  it("grades answers against the key", () => {
    assert.deepEqual(gradeQuiz([1, 0, 2], [1, 2, 2]), { results: [true, false, true], score: 2, total: 3 });
  });

  it("completes graded tasks on success and never undoes them", () => {
    assert.equal(gradedTaskStatus(undefined, false), "in_progress");
    assert.equal(gradedTaskStatus("in_progress", true), "completed");
    assert.equal(gradedTaskStatus("completed", false), "completed");
    assert.equal(manualTaskStatus(true), "completed");
    assert.equal(manualTaskStatus(false), "not_started");
  });

  it("derives the module from its tasks", () => {
    assert.equal(moduleStatusAfterTaskChange(undefined, ["in_progress", undefined], false), "in_progress");
    assert.equal(moduleStatusAfterTaskChange("in_progress", ["completed", "completed"], false), "completed");
    // A new task after completion does not reopen the module...
    assert.equal(moduleStatusAfterTaskChange("completed", ["completed", "in_progress"], false), "completed");
    // ...unless the reader unticks a task.
    assert.equal(moduleStatusAfterTaskChange("completed", ["completed", "not_started"], true), "in_progress");
    assert.equal(manualModuleStatus(true), "completed");
    assert.equal(manualModuleStatus(false), "in_progress");
  });
});
