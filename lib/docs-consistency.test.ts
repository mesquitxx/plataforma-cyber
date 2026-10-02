/**
 * The project's documents must agree with the code (Phase 8): links resolve,
 * the curriculum and phase counts match the seed and the roadmap, and every
 * lab the platform can start is documented.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { resolveCurriculum } from "../db/seed/curriculum";
import { AVAILABLE_LAB_SLUGS } from "./labs/catalog";

const docs = execFileSync("git", ["ls-files", "*.md", "*.mdx"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const read = (file: string) => fs.readFileSync(file, "utf8");

describe("documentation consistency", () => {
  it("has no broken relative link", () => {
    const broken: string[] = [];
    for (const file of docs) {
      // [text](target) outside code spans; external, mail and pure anchors skipped.
      const text = read(file).replace(/`[^`\n]*`/g, "");
      for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const resolved = path.join(path.dirname(file), decodeURIComponent(target.split("#")[0]));
        if (!fs.existsSync(resolved)) broken.push(`${file} -> ${target}`);
      }
    }
    assert.deepEqual(broken, []);
  });

  it("states the seed's track and module counts", () => {
    const { tracks, modules } = resolveCurriculum();
    assert.match(read("CLAUDE.md"), new RegExp(`Currículo \\(foco ofensivo, do zero, ${tracks.length} trilhas\\)`));
    assert.match(read("ROADMAP.md"), new RegExp(`\\*\\*${tracks.length} trilhas\\*\\*`));
    assert.match(read("ROADMAP.md"), new RegExp(`\\(${modules.length} módulos\\)`));
  });

  it("states the roadmap's phase count everywhere", () => {
    const phases = [...read("ROADMAP.md").matchAll(/^## Fase (\d+) — /gm)].map((m) => Number(m[1]));
    assert.deepEqual(phases, Array.from({ length: phases.length }, (_, i) => i));
    const claim = `${phases.length} fases (0 a ${phases.length - 1})`;
    for (const file of ["CLAUDE.md", "README.md"]) assert.ok(read(file).includes(claim), `${file}: "${claim}"`);
    assert.ok(read("ROADMAP.md").includes(`**${phases.length} fases de construção**`));
  });

  it("documents every lab the platform can start", () => {
    const lab = read("docs/LABORATORIO.md");
    for (const slug of AVAILABLE_LAB_SLUGS) assert.ok(lab.includes(`| \`${slug}\` |`), slug);
  });

  it("lists every project document in CLAUDE.md", () => {
    const claude = read("CLAUDE.md");
    for (const file of docs.filter((f) => /^docs\/[^/]+\.mdx?$/.test(f))) {
      assert.ok(claude.includes(`(${file})`), file);
    }
  });
});
