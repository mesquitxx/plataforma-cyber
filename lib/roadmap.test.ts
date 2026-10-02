import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { APP_PHASE, APP_VERSION, CONTENT_PHASES, contentPhaseForTrack } from "./roadmap";

const roadmap = fs.readFileSync("ROADMAP.md", "utf8");

describe("roadmap", () => {
  it("shows the version of package.json", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string };
    assert.equal(APP_VERSION, pkg.version);
    assert.equal(APP_VERSION.split(".")[1], String(APP_PHASE));
  });

  it("marks the current phase as done in ROADMAP.md", () => {
    assert.match(roadmap, new RegExp(`^## Fase ${APP_PHASE} — .+ ✅$`, "m"));
  });

  it("matches the content phases of ROADMAP.md", () => {
    for (const { phase, tracks: [from, to] } of CONTENT_PHASES) {
      assert.match(roadmap, new RegExp(`^## Fase ${phase} — Conteúdo: Trilhas ${from}–${to}`, "m"), `Fase ${phase}`);
    }
  });

  it("maps every track to its content phase", () => {
    assert.deepEqual([0, 2, 3, 5, 6, 8].map(contentPhaseForTrack), [9, 9, 10, 10, 11, 11]);
    assert.equal(contentPhaseForTrack(9), null);
  });
});
