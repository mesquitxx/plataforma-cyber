/**
 * Limits shared by the flag form (client) and lib/flag-hash.ts (server).
 * Kept apart so the client bundle never imports node:crypto.
 */

/** Longest accepted submission; anything longer is rejected before hashing. */
export const MAX_FLAG_LENGTH = 200;
