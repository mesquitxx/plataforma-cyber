/**
 * Module pagination: splits a module's MDX into parts for display only.
 * content/ is never changed and the MDX is compiled whole, as before; this
 * file decides which top-level elements of the compiled module each part
 * shows.
 *
 * Rules: every `##` section is one part. A section longer than
 * PART_WORD_LIMIT words is split at its `###` headings (whole `###` blocks
 * grouped in order up to the limit; a single `###` block is never cut).
 *
 * The plan is computed from the source with the same parser MDX uses
 * (remark-parse + remark-mdx + gfm + front-matter), so `##` inside code
 * blocks or JSX is never mistaken for a section. A top-level mdast heading
 * becomes exactly one top-level `h2`/`h3` element in the compiled module, so
 * the page splits the compiled elements by counting headings
 * (splitContentChildren). lib/module-pages.test.ts checks, for every module,
 * that the parts add up to the whole source and to the whole rendering.
 *
 * Pure (no file system, no database): used by the module page and `npm test`.
 */
import { Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import type { Heading, Root, RootContent } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";

/** About how many words a part may have before its section is split. */
export const PART_WORD_LIMIT = 2500;

/** Search parameter that holds the current part (1-based): ?parte=3. */
export const PART_PARAM = "parte";

/**
 * Where a part starts: the ordinal (0-based, among top-level headings) of
 * its section's `##` and of the `###` inside that section, or -1 for "the
 * section start". `{ h2: -1, h3: -1 }` is content before the first `##`.
 */
export type PartBoundary = { h2: number; h3: number };

export type ModulePart = {
  /** 1-based, as shown and as in ?parte=N. */
  number: number;
  /** Offsets in the source: source.slice(start, end) is this part. */
  start: number;
  end: number;
  boundary: PartBoundary;
  /** Plain text of the section's `##` heading. */
  sectionTitle: string;
  /** Plain text of the first `###` when the part continues a split section. */
  subtitle: string | null;
  /** True when the part does not start at its section's `##`. */
  continuation: boolean;
  words: number;
  /** Graded task slugs (<FlagInput task> / <Quiz task>) inside this part, in order. */
  tasks: string[];
};

export type ModulePlan = {
  /** source.slice(0, preambleEnd): front-matter and imports, nothing visible. */
  preambleEnd: number;
  parts: ModulePart[];
  /** Top-level `##` and `###` headings in the module (checked at render time). */
  headingCount: { h2: number; h3: number };
};

/** Same syntax extensions as the MDX build (next.config.ts). */
const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkFrontmatter, ["yaml"]);

export function parseModuleTree(source: string): Root {
  return parser.parse(source);
}

/** Nodes that render nothing: front-matter and ESM (import/export). */
export function isPreambleNode(node: RootContent): boolean {
  return node.type === "yaml" || node.type === "mdxjsEsm";
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function isHeading(node: RootContent, depth: 2 | 3): node is Heading {
  return node.type === "heading" && node.depth === depth;
}

const GRADED_COMPONENTS = new Set(["FlagInput", "Quiz"]);

/** Task slugs of every <FlagInput task="..."> / <Quiz task="..."> under the nodes. */
export function gradedTasksIn(nodes: RootContent[]): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; name?: string; attributes?: unknown[]; children?: unknown[] };
    if ((n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") && GRADED_COMPONENTS.has(n.name ?? "")) {
      for (const attr of n.attributes ?? []) {
        const a = attr as { type?: string; name?: string; value?: unknown };
        if (a.type === "mdxJsxAttribute" && a.name === "task" && typeof a.value === "string") found.push(a.value);
      }
    }
    for (const child of n.children ?? []) walk(child);
  };
  for (const node of nodes) walk(node);
  return found;
}

type Chunk = { index: number; boundary: PartBoundary; words: number };

/** Builds the pagination plan of one module source (the whole .mdx file). */
export function planModulePages(source: string, wordLimit = PART_WORD_LIMIT): ModulePlan {
  const nodes = parseModuleTree(source).children;
  const offset = (i: number) => (i < nodes.length ? nodes[i].position!.start.offset! : source.length);

  let first = 0;
  while (first < nodes.length && isPreambleNode(nodes[first])) first++;
  const preambleEnd = offset(first);

  // Sections: [start node index, end node index). Content before the first
  // `##` (none in today's modules) becomes a section of its own.
  type Section = { start: number; end: number; h2: number; title: string };
  const sections: Section[] = [];
  let h2Count = 0;
  let h3Count = 0;
  for (let i = first; i < nodes.length; i++) {
    const node = nodes[i];
    if (isHeading(node, 2)) {
      sections.push({ start: i, end: nodes.length, h2: h2Count++, title: toString(node) });
    } else if (sections.length === 0) {
      sections.push({ start: i, end: nodes.length, h2: -1, title: "Início" });
    }
    if (isHeading(node, 3)) h3Count++;
  }
  for (let k = 0; k + 1 < sections.length; k++) sections[k].end = sections[k + 1].start;

  const parts: ModulePart[] = [];
  const pushPart = (section: Section, from: number, to: number, boundary: PartBoundary) => {
    const start = offset(from);
    const end = offset(to);
    const subtitleNode = from === section.start ? null : nodes[from];
    parts.push({
      number: parts.length + 1,
      start,
      end,
      boundary,
      sectionTitle: section.title,
      subtitle: subtitleNode ? toString(subtitleNode) : null,
      continuation: from !== section.start,
      words: countWords(source.slice(start, end)),
      tasks: gradedTasksIn(nodes.slice(from, to)),
    });
  };

  for (const section of sections) {
    const sectionWords = countWords(source.slice(offset(section.start), offset(section.end)));
    const sectionBoundary = { h2: section.h2, h3: -1 };
    if (sectionWords <= wordLimit) {
      pushPart(section, section.start, section.end, sectionBoundary);
      continue;
    }

    // Chunks: the section's opening (its `##` up to the first `###`), then
    // one chunk per `###` block. Grouped greedily, never cut.
    const chunks: Chunk[] = [{ index: section.start, boundary: sectionBoundary, words: 0 }];
    let h3 = 0;
    for (let i = section.start + 1; i < section.end; i++) {
      if (isHeading(nodes[i], 3)) chunks.push({ index: i, boundary: { h2: section.h2, h3: h3++ }, words: 0 });
    }
    chunks.forEach((chunk, j) => {
      const to = j + 1 < chunks.length ? chunks[j + 1].index : section.end;
      chunk.words = countWords(source.slice(offset(chunk.index), offset(to)));
    });

    let groupStart = 0;
    let groupWords = 0;
    chunks.forEach((chunk, j) => {
      if (j > groupStart && groupWords + chunk.words > wordLimit) {
        pushPart(section, chunks[groupStart].index, chunk.index, chunks[groupStart].boundary);
        groupStart = j;
        groupWords = 0;
      }
      groupWords += chunk.words;
    });
    pushPart(section, chunks[groupStart].index, section.end, chunks[groupStart].boundary);
  }

  return { preambleEnd, parts, headingCount: { h2: h2Count, h3: h3Count } };
}

/** "Earlier or equal" for part boundaries (h2 first, then h3). */
function boundaryAtOrBefore(a: PartBoundary, b: PartBoundary): boolean {
  return a.h2 < b.h2 || (a.h2 === b.h2 && a.h3 <= b.h3);
}

export type BlockKind = "h2" | "h3" | "other";

/**
 * Assigns each top-level block (in order) to a part index (0-based), by
 * counting `##`/`###` the same way planModulePages numbers its boundaries.
 * Returns null if the headings do not match the plan (the caller then shows
 * the whole module, so nothing can go missing).
 */
export function assignBlocksToParts(kinds: BlockKind[], plan: ModulePlan): number[] | null {
  const h2Total = kinds.filter((k) => k === "h2").length;
  const h3Total = kinds.filter((k) => k === "h3").length;
  if (h2Total !== plan.headingCount.h2 || h3Total !== plan.headingCount.h3 || plan.parts.length === 0) {
    return null;
  }

  const result: number[] = [];
  const position: PartBoundary = { h2: -1, h3: -1 };
  let part = 0;
  for (const kind of kinds) {
    if (kind === "h2") {
      position.h2++;
      position.h3 = -1;
    } else if (kind === "h3") {
      position.h3++;
    }
    while (part + 1 < plan.parts.length && boundaryAtOrBefore(plan.parts[part + 1].boundary, position)) part++;
    result.push(part);
  }
  return result;
}

/** Kind of one top-level element of a compiled MDX module. */
export function blockKind(node: ReactNode): BlockKind {
  if (isValidElement(node) && (node.type === "h2" || node.type === "h3")) return node.type;
  return "other";
}

/**
 * The top-level children of a compiled MDX module, as returned by calling
 * its default export: a Fragment whose children are the module's blocks.
 * Null for any other shape (e.g. a `wrapper` component).
 */
export function mdxTopLevelChildren(tree: ReactNode): ReactNode[] | null {
  if (!isValidElement(tree) || tree.type !== Fragment) return null;
  const children = (tree as ReactElement<{ children?: ReactNode }>).props.children;
  return Array.isArray(children) ? children : [children];
}

/** Splits a compiled module's top-level children into the plan's parts. */
export function splitContentChildren(children: ReactNode[], plan: ModulePlan): ReactNode[][] | null {
  const assignment = assignBlocksToParts(children.map(blockKind), plan);
  if (!assignment) return null;
  const parts: ReactNode[][] = plan.parts.map(() => []);
  children.forEach((child, i) => parts[assignment[i]].push(child));
  return parts;
}

/**
 * Reads ?parte= (1-based). `redirectTo` is set when the value is present
 * but not a valid part number; it holds the nearest valid part.
 */
export function resolvePartParam(
  raw: string | string[] | undefined,
  total: number,
): { part: number; redirectTo: number | null } {
  if (raw === undefined || total < 1) return { part: 1, redirectTo: null };
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (/^[1-9]\d*$/.test(value ?? "") && Number(value) <= total) return { part: Number(value), redirectTo: null };
  const parsed = Number.parseInt(value ?? "", 10);
  const nearest = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), total);
  return { part: nearest, redirectTo: nearest };
}

/** URL of one part of a module page (part 1 also carries ?parte=1). */
export function partHref(moduleHref: string, part: number, hash?: string): string {
  return `${moduleHref}?${PART_PARAM}=${part}${hash ? `#${hash}` : ""}`;
}
