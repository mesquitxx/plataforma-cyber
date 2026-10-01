import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LAB_CATALOG } from "../../lib/labs/catalog";
import { LABS, TRACKS, resolveCurriculum, type TrackSeed } from "./curriculum";

describe("curriculum seed", () => {
  const curriculum = resolveCurriculum();
  const bySlug = new Map(curriculum.modules.map((m) => [m.slug, m]));

  it("matches docs/CURRICULO.md in size (Phase 6: Cryptography track and 4 new modules)", () => {
    assert.equal(curriculum.tracks.length, 9);
    assert.deepEqual(
      curriculum.tracks.map((t) => t.modules.length),
      [8, 5, 8, 5, 10, 6, 7, 5, 5],
    );
    assert.equal(curriculum.modules.length, 59);
    assert.deepEqual(
      curriculum.tracks.map((t) => t.slug),
      Array.from({ length: 9 }, (_, n) => `trilha-${n}`),
    );
  });

  it("places the Phase 6 modules where docs/CURRICULO.md says", () => {
    const at = (slug: string) => {
      const m = bySlug.get(slug)!;
      return `${m.trackSlug}#${m.sortOrder}`;
    };
    assert.equal(at("osint-e-reconhecimento-passivo"), "trilha-2#2");
    assert.equal(at("engenharia-social-e-phishing"), "trilha-2#3");
    assert.equal(at("nmap"), "trilha-2#4");
    assert.equal(at("fundamentos-de-criptografia"), "trilha-3#1");
    assert.equal(at("cripto-pos-quantica"), "trilha-3#5");
    assert.equal(at("web-por-dentro"), "trilha-4#1");
    assert.equal(at("seguranca-de-apis-e-graphql"), "trilha-4#9");
    assert.equal(at("mini-projeto-web"), "trilha-4#10");
    assert.equal(at("pos-exploracao-e-persistencia"), "trilha-6#7");
    assert.equal(at("projeto-final"), "trilha-8#5");
  });

  it("uses one seed row per catalog lab", () => {
    assert.deepEqual(
      LABS.map((l) => l.slug),
      LAB_CATALOG.map((l) => l.slug),
    );
  });

  it("expands whole-track prerequisites", () => {
    assert.equal(bySlug.get("o-que-e-pentest")!.prerequisites.length, 8);
    assert.deepEqual(
      [...bySlug.get("kali-linux")!.prerequisites].sort(),
      [...TRACKS[0].modules.map((m) => m.slug), "escopo-e-autorizacao"].sort(),
    );
    // Tracks 2–7: 8 + 5 + 10 + 6 + 7 + 5 modules.
    assert.equal(bySlug.get("metodologia-completa")!.prerequisites.length, 41);
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
    assert.throws(
      () => resolveCurriculum([{ ...base([])[0], slug: "trilha-1" }], []),
      /must be trilha-0/,
    );
    assert.doesNotThrow(() => resolveCurriculum(base(["first"]), []));
  });
});
