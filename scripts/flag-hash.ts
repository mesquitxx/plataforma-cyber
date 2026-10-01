/**
 * Prints the front-matter block for a flag task, so the answer itself never
 * has to be written in the MDX. Usage:
 *
 *   npm run flag:hash -- 'FLAG{...}'
 */
import { hashFlag, MAX_FLAG_LENGTH, normalizeFlag } from "../lib/flag-hash";

const value = process.argv[2];
if (process.argv.length !== 3 || !value) {
  console.error("Usage: npm run flag:hash -- 'FLAG{...}'");
  process.exit(2);
}
if (normalizeFlag(value).length > MAX_FLAG_LENGTH) {
  console.error(`Flags are limited to ${MAX_FLAG_LENGTH} characters.`);
  process.exit(2);
}

const { hash, salt } = hashFlag(value);
console.log("    flag:");
console.log(`      hash: "${hash}"`);
console.log(`      salt: "${salt}"`);
