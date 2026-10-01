import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRACKS } from "@/db/seed/curriculum";
import { hashFlag } from "./flag-hash";
import {
  checkContent,
  checkModule,
  ContentError,
  curriculumIndex,
  loadModuleSources,
  parseModuleSource,
} from "./module-source";

const curriculum = curriculumIndex(TRACKS);
const { hash, salt } = hashFlag("FLAG{x}");
const FILE = "content/trilha-0/terminal-linux/index.mdx";

function source({ frontmatter = "", body = "" } = {}) {
  return `---
slug: terminal-linux
track: trilha-0
title: "Linux: primeiros passos no terminal"
prerequisites: [como-usar-a-plataforma]
lab: linux-sandbox
glossary:
  - term: shell
    definition: Programa que interpreta comandos.
tasks:
  - slug: missao-1
    title: Missão 1
    type: flag
    flag: { hash: "${hash}", salt: "${salt}" }
${frontmatter}---
Texto com <GlossaryTerm term="shell">shell</GlossaryTerm>.

<FlagInput task="missao-1" />
${body}`;
}

describe("module sources", () => {
  it("parses a valid module and finds its references", () => {
    const parsed = parseModuleSource(FILE, source());
    assert.equal(parsed.frontmatter.slug, "terminal-linux");
    assert.deepEqual(parsed.flagInputs, ["missao-1"]);
    assert.deepEqual(parsed.glossaryRefs, ["shell"]);
    assert.ok(parsed.body.startsWith("Texto com"));
    assert.deepEqual(checkModule(parsed, curriculum), []);
  });

  it("rejects missing front-matter, bad YAML and unknown keys", () => {
    assert.throws(() => parseModuleSource(FILE, "# sem front-matter"), ContentError);
    assert.throws(() => parseModuleSource(FILE, "---\nslug: [\n---\n"), /invalid YAML/);
    assert.throws(() => parseModuleSource(FILE, source({ frontmatter: "extra: 1\n" })), /extra/);
  });

  it("rejects a flag task without a real hash", () => {
    const bad = source().replace(hash, "FLAG{em-claro}");
    assert.throws(() => parseModuleSource(FILE, bad), /scrypt hash/);
  });

  it("requires the front-matter to match the curriculum", () => {
    const parsed = parseModuleSource(FILE, source().replace("[como-usar-a-plataforma]", "[]"));
    assert.match(checkModule(parsed, curriculum).join("\n"), /prerequisites should be/);
    const wrongPath = parseModuleSource("content/trilha-1/terminal-linux/index.mdx", source());
    assert.match(checkModule(wrongPath, curriculum).join("\n"), /file should be/);
  });

  it("ties flag tasks to <FlagInput> and glossary terms to <GlossaryTerm>", () => {
    const orphanInput = parseModuleSource(FILE, source({ body: '<FlagInput task="nada" />\n' }));
    assert.match(checkModule(orphanInput, curriculum).join("\n"), /has no flag task/);
    const unusedTerm = parseModuleSource(FILE, source().replace('term="shell"', 'term="bash"'));
    assert.match(checkModule(unusedTerm, curriculum).join("\n"), /never marked/);
    assert.throws(() => checkContent([unusedTerm], curriculum), /not declared by any module/);
  });

  it("accepts every module in content/", () => {
    const modules = loadModuleSources(process.cwd());
    assert.ok(modules.length > 0, "expected at least the pilot module");
    assert.doesNotThrow(() => checkContent(modules, curriculum));
  });
});
