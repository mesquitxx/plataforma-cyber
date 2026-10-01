import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LABS, TRACKS, resolveCurriculum, type TrackSeed } from "./curriculum";
import { DEMO_PROGRESS } from "./demo-progress";

describe("curriculum seed", () => {
  const curriculum = resolveCurriculum();
  const bySlug = new Map(curriculum.modules.map((m) => [m.slug, m]));

  it("matches docs/CURRICULO.md in size", () => {
    assert.equal(curriculum.tracks.length, 8);
    assert.deepEqual(
      curriculum.tracks.map((t) => t.modules.length),
      [7, 5, 6, 9, 6, 6, 5, 5],
    );
    assert.equal(curriculum.modules.length, 49);
    assert.equal(LABS.length, 4);
  });

  it("expands whole-track prerequisites", () => {
    assert.equal(bySlug.get("o-que-e-pentest")!.prerequisites.length, 7);
    assert.deepEqual(
      [...bySlug.get("kali-linux")!.prerequisites].sort(),
      [...TRACKS[0].modules.map((m) => m.slug), "escopo-e-autorizacao"].sort(),
    );
    // Tracks 2–6: 6 + 9 + 6 + 6 + 5 modules.
    assert.equal(bySlug.get("metodologia-completa")!.prerequisites.length, 32);
  });

  it("rejects unknown, later or self-track references", () => {
    const base = (prerequisites: string[]): TrackSeed[] => [
      {
        slug: "trilha-0",
        number: 0,
        title: "T",
        description: "",
        modules: [
          { slug: "first", title: "F", prerequisites: [] },
          { slug: "second", title: "S", prerequisites },
        ],
      },
    ];
    assert.throws(() => resolveCurriculum(base(["missing"]), []), /unknown or not earlier/);
    assert.throws(() => resolveCurriculum(base(["second"]), []), /unknown or not earlier/);
    assert.throws(() => resolveCurriculum(base(["trilha-0"]), []), /its own track/);
    assert.doesNotThrow(() => resolveCurriculum(base(["first"]), []));
  });

  it("only references known modules in the demo progress", () => {
    for (const entry of DEMO_PROGRESS) assert.ok(bySlug.has(entry.moduleSlug), entry.moduleSlug);
  });
});
