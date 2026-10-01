import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { TRACKS } from "../../db/seed/curriculum";
import { AVAILABLE_LAB_SLUGS, LAB_CATALOG, getLab, isAvailable } from "./catalog";

describe("lab catalog", () => {
  it("has unique kebab-case slugs", () => {
    const slugs = LAB_CATALOG.map((l) => l.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("agrees with the closed registry of scripts/lab.sh", () => {
    // Only `list` runs: it needs bash, not Docker.
    const out = execFileSync(path.join(process.cwd(), "scripts/lab.sh"), ["list"], { encoding: "utf8" });
    const registry = out
      .trim()
      .split("\n")
      .map((line) => {
        const [slug, kind, project, files] = line.split("\t");
        return { slug, kind, project, composeFiles: files.split(",") };
      });
    const available = LAB_CATALOG.filter(isAvailable).map((l) => ({
      slug: l.slug,
      kind: l.kind,
      project: l.run.project,
      composeFiles: l.run.composeFiles,
    }));
    assert.deepEqual(registry, available);
    assert.deepEqual(AVAILABLE_LAB_SLUGS, available.map((l) => l.slug));
  });

  it("keeps planned labs out of reach until their phase", () => {
    for (const lab of LAB_CATALOG) {
      if (isAvailable(lab)) {
        assert.equal(lab.plannedPhase, null, lab.slug);
        for (const file of lab.run.composeFiles) assert.doesNotMatch(file, /^\/|\.\./, lab.slug);
      } else {
        assert.ok(lab.plannedPhase && lab.plannedPhase > 6, lab.slug);
        assert.ok(!AVAILABLE_LAB_SLUGS.includes(lab.slug), lab.slug);
      }
    }
  });

  it("publishes only Guacamole, and only from desktop labs", () => {
    for (const lab of LAB_CATALOG) {
      assert.equal(lab.localPort, lab.kind === "desktop" ? 8080 : null, lab.slug);
    }
  });

  it("covers every lab the curriculum uses", () => {
    for (const track of TRACKS) {
      for (const entry of track.modules) {
        if (entry.lab) assert.ok(getLab(entry.lab), `${entry.slug} -> ${entry.lab}`);
      }
    }
  });
});
