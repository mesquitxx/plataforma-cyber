/**
 * Glossary page helpers (Phase 5): anchors, A–Z grouping, pt-BR sorting and
 * accent-insensitive search. Pure and client-safe (no database).
 */

/** Lower case, no accents: "Função" -> "funcao". */
export function foldText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Stable anchor of a term on /glossario, e.g. "flag (CTF)" -> "t-flag-ctf". */
export function termAnchor(term: string): string {
  const slug = foldText(term)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `t-${slug}`;
}

/** Heading letter of a term: A–Z, or "#" for digits and symbols. */
export function termLetter(term: string): string {
  const first = foldText(term.trim()).charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export function compareTerms(a: string, b: string): number {
  return collator.compare(a, b);
}

/** Groups entries by heading letter, letters in order ("#" first), terms sorted inside. */
export function groupByLetter<T extends { term: string }>(entries: T[]): { letter: string; entries: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const entry of [...entries].sort((a, b) => compareTerms(a.term, b.term))) {
    const letter = termLetter(entry.term);
    groups.set(letter, [...(groups.get(letter) ?? []), entry]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)))
    .map(([letter, list]) => ({ letter, entries: list }));
}

/** True when every word of the query appears in the term or the definition. */
export function matchesQuery(entry: { term: string; definition: string }, query: string): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = foldText(`${entry.term} ${entry.definition}`);
  return words.every((word) => haystack.includes(word));
}
