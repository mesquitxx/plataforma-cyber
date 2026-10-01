import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { labRunState, parseStatusOutput, summarizeStatus, type ContainerRow } from "./status";

// Real `scripts/lab.sh status` output with the dvwa lab up (Phase 6), plus a
// container of another Compose project.
const DVWA_UP = [
  "cyberlab-guacamole-1\tcyberlab\tguacamole\trunning\t-\tdvwa",
  "cyberlab-dvwa-1\tcyberlab\tdvwa\trunning\t-\tdvwa",
  "cyberlab-guac-db-1\tcyberlab\tguac-db\trunning\thealthy\tdvwa",
  "cyberlab-guacd-1\tcyberlab\tguacd\trunning\thealthy\tdvwa",
  "cyberlab-kali-1\tcyberlab\tkali\trunning\thealthy\tdvwa",
  "cyberlab-dvwa-db-1\tcyberlab\tdvwa-db\trunning\thealthy\tdvwa",
  "other-web-1\tother\tweb\trunning\t-\t-",
  "",
].join("\n");

const row = (state: string, health: string | null = null): ContainerRow => ({
  name: "x",
  project: "cyberlab",
  service: "x",
  state,
  health,
  lab: "dvwa",
});

describe("lab status", () => {
  it("parses the status lines, with '-' as missing health or lab", () => {
    const rows = parseStatusOutput(DVWA_UP);
    assert.equal(rows.length, 7);
    assert.deepEqual(rows[0], {
      name: "cyberlab-guacamole-1",
      project: "cyberlab",
      service: "guacamole",
      state: "running",
      health: null,
      lab: "dvwa",
    });
    assert.equal(rows[2].health, "healthy");
    assert.equal(rows[6].lab, null);
    assert.deepEqual(parseStatusOutput(""), []);
    assert.throws(() => parseStatusOutput("only\ttwo"), /Unexpected/);
  });

  it("derives one state per lab", () => {
    assert.equal(labRunState([]), "stopped");
    assert.equal(labRunState([row("exited")]), "stopped");
    assert.equal(labRunState([row("running", "healthy"), row("running")]), "running");
    assert.equal(labRunState([row("running", "starting"), row("running")]), "starting");
    assert.equal(labRunState([row("running"), row("created")]), "starting");
    assert.equal(labRunState([row("running"), row("exited")]), "degraded");
    assert.equal(labRunState([row("running", "unhealthy")]), "degraded");
  });

  it("summarizes running labs and foreign containers", () => {
    const status = summarizeStatus(parseStatusOutput(DVWA_UP));
    assert.deepEqual(status.states, { dvwa: "running" });
    assert.deepEqual(status.running, ["dvwa"]);
    assert.deepEqual(status.foreign, ["other-web-1"]);
    assert.deepEqual(summarizeStatus([]), { states: {}, running: [], foreign: [] });
  });
});
