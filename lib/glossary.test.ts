import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupByLetter, matchesQuery, termAnchor, termLetter } from "./glossary";

describe("glossary helpers", () => {
  it("builds stable anchors", () => {
    assert.equal(termAnchor("flag (CTF)"), "t-flag-ctf");
    assert.equal(termAnchor("Função hash"), "t-funcao-hash");
    assert.equal(termAnchor("UID"), "t-uid");
  });

  it("groups by letter, ignoring case and accents", () => {
    assert.equal(termLetter("ética"), "E");
    assert.equal(termLetter("2FA"), "#");
    const groups = groupByLetter([
      { term: "shell" },
      { term: "Bash" },
      { term: "stdin" },
      { term: "árvore" },
      { term: "2FA" },
      { term: "builtin" },
    ]);
    assert.deepEqual(
      groups.map((g) => [g.letter, g.entries.map((e) => e.term)]),
      [
        ["#", ["2FA"]],
        ["A", ["árvore"]],
        ["B", ["Bash", "builtin"]],
        ["S", ["shell", "stdin"]],
      ],
    );
  });

  it("searches term and definition without accents", () => {
    const entry = { term: "kernel", definition: "O núcleo do sistema operacional." };
    assert.equal(matchesQuery(entry, ""), true);
    assert.equal(matchesQuery(entry, "nucleo"), true);
    assert.equal(matchesQuery(entry, "KERNEL sistema"), true);
    assert.equal(matchesQuery(entry, "rede"), false);
  });
});
