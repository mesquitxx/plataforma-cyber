/**
 * Flag hashing (Phase 4). Flags are never stored in clear text: the module
 * front-matter and the database only hold a salt and a scrypt hash.
 *
 * Normalization: trim surrounding whitespace and apply Unicode NFC; the
 * comparison is otherwise exact (case-sensitive), as in most CTFs.
 * Stored format: "scrypt$<N>$<r>$<p>$<hex>", so parameters can change later
 * without breaking existing hashes. The salt is stored as hex, separately.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { MAX_FLAG_LENGTH } from "./flag-hash-limits";

export { MAX_FLAG_LENGTH };

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;

export function normalizeFlag(value: string): string {
  return value.normalize("NFC").trim();
}

function derive(value: string, saltHex: string, n: number, r: number, p: number): Buffer {
  return scryptSync(normalizeFlag(value), Buffer.from(saltHex, "hex"), KEY_LENGTH, {
    N: n,
    r,
    p,
  });
}

export function hashFlag(value: string, saltHex = randomBytes(SALT_BYTES).toString("hex")) {
  if (normalizeFlag(value).length === 0) throw new Error("Empty flag");
  const hash = `scrypt$${N}$${R}$${P}$${derive(value, saltHex, N, R, P).toString("hex")}`;
  return { hash, salt: saltHex };
}

const HASH_FORMAT = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([0-9a-f]{64})$/;
const SALT_FORMAT = /^[0-9a-f]{32}$/;

export function isFlagHash(hash: string): boolean {
  return HASH_FORMAT.test(hash);
}

export function isFlagSalt(salt: string): boolean {
  return SALT_FORMAT.test(salt);
}

/** Constant-time check of a submitted value against a stored hash. */
export function verifyFlag(value: string, hash: string, saltHex: string): boolean {
  const match = HASH_FORMAT.exec(hash);
  if (!match || !isFlagSalt(saltHex)) return false;
  const normalized = normalizeFlag(value);
  if (normalized.length === 0 || normalized.length > MAX_FLAG_LENGTH) return false;
  const [, n, r, p, expectedHex] = match;
  const actual = derive(normalized, saltHex, Number(n), Number(r), Number(p));
  return timingSafeEqual(actual, Buffer.from(expectedHex, "hex"));
}
