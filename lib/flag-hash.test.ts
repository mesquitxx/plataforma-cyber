import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashFlag, isFlagHash, isFlagSalt, MAX_FLAG_LENGTH, verifyFlag } from "./flag-hash";

describe("flag hashing", () => {
  const { hash, salt } = hashFlag("FLAG{teste-123}");

  it("produces the documented formats", () => {
    assert.ok(isFlagHash(hash), hash);
    assert.ok(isFlagSalt(salt), salt);
    assert.ok(!hash.includes("teste"));
  });

  it("accepts the exact answer, ignoring surrounding whitespace", () => {
    assert.equal(verifyFlag("FLAG{teste-123}", hash, salt), true);
    assert.equal(verifyFlag("  FLAG{teste-123}\n", hash, salt), true);
  });

  it("is case-sensitive and rejects anything else", () => {
    assert.equal(verifyFlag("flag{teste-123}", hash, salt), false);
    assert.equal(verifyFlag("FLAG{teste-124}", hash, salt), false);
    assert.equal(verifyFlag("", hash, salt), false);
    assert.equal(verifyFlag("x".repeat(MAX_FLAG_LENGTH + 1), hash, salt), false);
  });

  it("applies Unicode NFC normalization", () => {
    const composed = hashFlag("FLAG{permissão}");
    // "a" + combining tilde, the decomposed form of "ã".
    assert.equal(verifyFlag("FLAG{permissão}", composed.hash, composed.salt), true);
  });

  it("uses a fresh salt each time and is deterministic for a given salt", () => {
    assert.notEqual(hashFlag("FLAG{a}").salt, hashFlag("FLAG{a}").salt);
    assert.equal(hashFlag("FLAG{a}", salt).hash, hashFlag("FLAG{a}", salt).hash);
  });

  it("rejects malformed stored values instead of throwing", () => {
    assert.equal(verifyFlag("FLAG{teste-123}", "sha256$abc", salt), false);
    assert.equal(verifyFlag("FLAG{teste-123}", hash, "zz"), false);
    assert.throws(() => hashFlag("   "), /Empty flag/);
  });
});
