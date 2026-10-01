import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LABS, TRACKS, resolveCurriculum, type TrackSeed } from "./curriculum";

describe("curriculum seed", () => {
  const curriculum = resolveCurriculum();
  const bySlug = new Map(curriculum.modules.map((m) => [m.slug, m]));

  it("matches docs/CURRICULO.md in size (0.3 split in Phase 4)", () => {
    assert.equal(curriculum.tracks.length, 8);
    assert.deepEqual(
      curriculum.tracks.map((t) => t.modules.length),
      [8, 5, 6, 9, 6, 6, 5, 5],
    );
    assert.equal(curriculum.modules.length, 50);
    assert.equal(LABS.length, 5);
  });

  it("expands whole-track prerequisites", () => {
    assert.equal(bySlug.get("o-que-e-pentest")!.prerequisites.length, 8);
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
});
