import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCurriculumView,
  deriveModuleState,
  findModule,
  formatModuleNumber,
  summarizeProgress,
  type CurriculumSnapshot,
} from "./curriculum-state";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

/** Two tracks: a1 → a2 → b1, and b2 with no prerequisites. */
function snapshot(progress: CurriculumSnapshot["progress"] = []): CurriculumSnapshot {
  return {
    tracks: [
      { id: 20, slug: "trilha-1", number: 1, title: "B", description: "", sortOrder: 2 },
      { id: 10, slug: "trilha-0", number: 0, title: "A", description: "", sortOrder: 1 },
    ],
    modules: [
      { id: 2, trackId: 10, slug: "a2", title: "A2", sortOrder: 2, labId: null },
      { id: 1, trackId: 10, slug: "a1", title: "A1", sortOrder: 1, labId: null },
      { id: 3, trackId: 20, slug: "b1", title: "B1", sortOrder: 1, labId: 7 },
      { id: 4, trackId: 20, slug: "b2", title: "B2", sortOrder: 2, labId: null },
    ],
    prerequisites: [
      { moduleId: 2, requiredModuleId: 1 },
      { moduleId: 3, requiredModuleId: 2 },
    ],
    progress,
    labs: [{ id: 7, slug: "dvwa" }],
  };
}

const stateOf = (view: ReturnType<typeof buildCurriculumView>, slug: string) =>
  view.modules.find((m) => m.slug === slug)!.state;

describe("deriveModuleState", () => {
  it("lets recorded progress win over prerequisites", () => {
    assert.equal(deriveModuleState("completed", [undefined]), "completed");
    assert.equal(deriveModuleState("in_progress", ["not_started"]), "in_progress");
  });

  it("is available without prerequisites or when all are completed", () => {
    assert.equal(deriveModuleState(undefined, []), "available");
    assert.equal(deriveModuleState("not_started", ["completed", "completed"]), "available");
  });

  it("is locked when any prerequisite is unfinished", () => {
    assert.equal(deriveModuleState(undefined, ["completed", "in_progress"]), "locked");
    assert.equal(deriveModuleState(undefined, [undefined]), "locked");
  });
});

describe("summarizeProgress", () => {
  it("counts states and rounds the percentage down", () => {
    assert.deepEqual(summarizeProgress(["completed", "in_progress", "locked"]), {
      total: 3,
      completed: 1,
      inProgress: 1,
      percent: 33,
    });
  });

  it("reports 0% for an empty list", () => {
    assert.equal(summarizeProgress([]).percent, 0);
  });
});

describe("buildCurriculumView", () => {
  it("orders tracks and modules and formats module numbers", () => {
    const view = buildCurriculumView(snapshot());
    assert.deepEqual(
      view.modules.map((m) => `${m.number} ${m.slug}`),
      ["0.1 a1", "0.2 a2", "1.1 b1", "1.2 b2"],
    );
    assert.equal(view.modules[2].href, "/trilhas/trilha-1/b1");
    assert.equal(view.modules[2].labSlug, "dvwa");
    assert.equal(formatModuleNumber(3, 9), "3.9");
  });

  it("derives locked/available states and pending prerequisites", () => {
    const view = buildCurriculumView(
      snapshot([{ moduleId: 1, status: "completed", updatedAt: hoursAgo(5) }]),
    );
    assert.equal(stateOf(view, "a1"), "completed");
    assert.equal(stateOf(view, "a2"), "available");
    assert.equal(stateOf(view, "b1"), "locked");
    assert.equal(stateOf(view, "b2"), "available");

    const b1 = view.modules.find((m) => m.slug === "b1")!;
    assert.deepEqual(
      b1.pendingPrerequisites.map((p) => p.slug),
      ["a2"],
    );
    assert.equal(view.modules.find((m) => m.slug === "a2")!.pendingPrerequisites.length, 0);
    assert.deepEqual(view.summary, { total: 4, completed: 1, inProgress: 0, percent: 25 });
    assert.equal(view.tracks[0].summary.percent, 50);
  });

  it("continues the most recently updated in-progress module", () => {
    const view = buildCurriculumView(
      snapshot([
        { moduleId: 1, status: "in_progress", updatedAt: hoursAgo(1) },
        { moduleId: 4, status: "in_progress", updatedAt: hoursAgo(10) },
      ]),
    );
    assert.equal(view.continueTarget?.module.slug, "a1");
    assert.equal(view.continueTarget?.reason, "in_progress");
    assert.equal(view.continueTarget?.track.slug, "trilha-0");
  });

  it("falls back to the first available module in curriculum order", () => {
    const view = buildCurriculumView(
      snapshot([{ moduleId: 1, status: "completed", updatedAt: hoursAgo(1) }]),
    );
    assert.equal(view.continueTarget?.module.slug, "a2");
    assert.equal(view.continueTarget?.reason, "next_available");
  });

  it("has nothing to continue when everything is completed or there is no content", () => {
    const done = buildCurriculumView(
      snapshot([1, 2, 3, 4].map((moduleId) => ({ moduleId, status: "completed", updatedAt: hoursAgo(1) }))),
    );
    assert.equal(done.continueTarget, null);
    assert.equal(done.summary.percent, 100);

    const empty = buildCurriculumView({ tracks: [], modules: [], prerequisites: [], progress: [], labs: [] });
    assert.equal(empty.continueTarget, null);
    assert.equal(empty.summary.total, 0);
  });
});

describe("findModule", () => {
  it("finds a module with its neighbours across tracks", () => {
    const found = findModule(buildCurriculumView(snapshot()), "trilha-1", "b1");
    assert.equal(found?.module.slug, "b1");
    assert.equal(found?.previous?.slug, "a2");
    assert.equal(found?.next?.slug, "b2");
  });

  it("returns null for unknown slugs or a module under the wrong track", () => {
    const view = buildCurriculumView(snapshot());
    assert.equal(findModule(view, "trilha-0", "b1"), null);
    assert.equal(findModule(view, "trilha-9", "a1"), null);
    assert.equal(findModule(view, "trilha-0", "nope"), null);
  });
});
