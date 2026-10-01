import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_OUTPUT_LINES, appendOutput, exitMessage } from "./jobs";

describe("lab jobs", () => {
  it("joins output chunks into lines, even when a line is split", () => {
    let lines: string[] = [];
    lines = appendOutput(lines, "==> Starting lab 'dvwa'\n Container a ");
    lines = appendOutput(lines, "Started\r\n");
    lines = appendOutput(lines, "done");
    assert.deepEqual(lines, ["==> Starting lab 'dvwa'", " Container a Started", "done"]);
  });

  it("keeps only the last lines", () => {
    const many = Array.from({ length: MAX_OUTPUT_LINES + 10 }, (_, i) => `line ${i}`).join("\n");
    const lines = appendOutput([], `${many}\n`);
    assert.equal(lines.length, MAX_OUTPUT_LINES);
    assert.equal(lines[0], "line 11");
  });

  it("explains each exit code of scripts/lab.sh", () => {
    assert.match(exitMessage({ action: "up", lab: "dvwa", exitCode: null }), /Iniciando/);
    assert.equal(exitMessage({ action: "up", lab: "dvwa", exitCode: 0 }), "Concluído.");
    assert.match(exitMessage({ action: "verify", lab: "dvwa", exitCode: 0 }), /todos os testes/);
    assert.match(exitMessage({ action: "up", lab: "dvwa", exitCode: 3 }), /lab\.sh pull dvwa/);
    assert.match(exitMessage({ action: "up", lab: "dvwa", exitCode: 4 }), /em andamento/);
    assert.match(exitMessage({ action: "up", lab: "kali", exitCode: 5 }), /um por vez/);
    assert.match(exitMessage({ action: "verify", lab: "dvwa", exitCode: 1 }), /falhas/);
    assert.match(exitMessage({ action: "reset", lab: "dvwa", exitCode: -1 }), /falhou/);
  });
});
