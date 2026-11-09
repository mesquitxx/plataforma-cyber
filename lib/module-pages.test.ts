import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { RootContent } from "mdast";
import { createElement, Fragment, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { parseModuleSource } from "./module-source";
import {
  assignBlocksToParts,
  countWords,
  isPreambleNode,
  mdxTopLevelChildren,
  parseModuleTree,
  partHref,
  planModulePages,
  PART_WORD_LIMIT,
  resolvePartParam,
  splitContentChildren,
  type BlockKind,
  type ModulePlan,
} from "./module-pages";

const FM = "---\nslug: x\n---\n\nimport img from \"./img/a.svg\";\n\n";
const words = (n: number, word = "palavra") => Array.from({ length: n }, () => word).join(" ");
const joined = (source: string, plan: ModulePlan) =>
  source.slice(0, plan.preambleEnd) + plan.parts.map((p) => source.slice(p.start, p.end)).join("");

describe("planModulePages", () => {
  it("makes one part per ## section and keeps the preamble out", () => {
    const source = `${FM}## 1. Um\n\ntexto\n\n### 1.1 Sub\n\nmais\n\n## 2. Dois\n\nfim\n`;
    const plan = planModulePages(source);
    assert.equal(plan.parts.length, 2);
    assert.equal(source.slice(0, plan.preambleEnd), FM);
    assert.deepEqual(
      plan.parts.map((p) => [p.sectionTitle, p.continuation, p.boundary]),
      [
        ["1. Um", false, { h2: 0, h3: -1 }],
        ["2. Dois", false, { h2: 1, h3: -1 }],
      ],
    );
    assert.equal(joined(source, plan), source);
    assert.deepEqual(plan.headingCount, { h2: 2, h3: 1 });
  });

  it("ignores headings inside code blocks and JSX", () => {
    const source = `${FM}## 1. Um\n\n\`\`\`bash\n## not a section\n### nor this\n\`\`\`\n\n<Callout>\n\n## inside JSX\n\n</Callout>\n`;
    const plan = planModulePages(source);
    assert.equal(plan.parts.length, 1);
    assert.deepEqual(plan.headingCount, { h2: 1, h3: 0 });
  });

  it("splits a long section at ### blocks, never inside one, and repeats the section title", () => {
    const source =
      `${FM}## 2. Teoria\n\n${words(100)}\n\n` +
      `### 2.1 A\n\n${words(1500)}\n\n### 2.2 B\n\n${words(1500)}\n\n` +
      `### 2.3 C\n\n${words(3000)}\n\n### 2.4 D\n\n${words(10)}\n\n## 3. Fim\n\nok\n`;
    const plan = planModulePages(source);
    assert.deepEqual(
      plan.parts.map((p) => [p.sectionTitle, p.subtitle, p.continuation]),
      [
        ["2. Teoria", null, false], // intro + 2.1
        ["2. Teoria", "2.2 B", true], // 2.2 alone (2.2 + 2.3 > limit)
        ["2. Teoria", "2.3 C", true], // 2.3 is over the limit by itself: kept whole
        ["2. Teoria", "2.4 D", true],
        ["3. Fim", null, false],
      ],
    );
    assert.equal(plan.parts[2].words > PART_WORD_LIMIT, true);
    assert.equal(joined(source, plan), source);
  });

  it("keeps a long section without ### whole", () => {
    const source = `${FM}## 1. Longa\n\n${words(4000)}\n`;
    assert.equal(planModulePages(source).parts.length, 1);
  });

  it("keeps content before the first ## as a part of its own", () => {
    const source = `${FM}Intro solta.\n\n## 1. Um\n\nx\n`;
    const plan = planModulePages(source);
    assert.deepEqual(
      plan.parts.map((p) => [p.sectionTitle, p.boundary]),
      [
        ["Início", { h2: -1, h3: -1 }],
        ["1. Um", { h2: 0, h3: -1 }],
      ],
    );
    assert.equal(joined(source, plan), source);
  });

  it("finds graded tasks, including inside other components", () => {
    const source = `${FM}## 1. Um\n\n<FlagInput task="f1" />\n\n## 2. Dois\n\n<Callout>\n\n<Quiz task="q1" />\n\n</Callout>\n`;
    assert.deepEqual(
      planModulePages(source).parts.map((p) => p.tasks),
      [["f1"], ["q1"]],
    );
  });
});

describe("assignBlocksToParts", () => {
  const source =
    `${FM}## 1. Um\n\n${words(10)}\n\n## 2. Dois\n\n${words(50)}\n\n### 2.1 A\n\n${words(2000)}\n\n` +
    `### 2.2 B\n\n${words(2000)}\n`;
  const plan = planModulePages(source);

  it("maps blocks to parts by counting headings", () => {
    assert.equal(plan.parts.length, 3);
    const kinds: BlockKind[] = ["other", "h2", "other", "other", "h2", "other", "h3", "other", "h3", "other"];
    assert.deepEqual(assignBlocksToParts(kinds, plan), [0, 0, 0, 0, 1, 1, 1, 1, 2, 2]);
  });

  it("refuses when the headings do not match the plan", () => {
    assert.equal(assignBlocksToParts(["h2", "h2"], plan), null);
    assert.equal(assignBlocksToParts(["h2", "h2", "h3", "h3", "h3"], plan), null);
  });
});

describe("resolvePartParam / partHref", () => {
  it("reads ?parte= and points invalid values to the nearest part", () => {
    assert.deepEqual(resolvePartParam(undefined, 5), { part: 1, redirectTo: null });
    assert.deepEqual(resolvePartParam("3", 5), { part: 3, redirectTo: null });
    assert.deepEqual(resolvePartParam("9", 5), { part: 5, redirectTo: 5 });
    assert.deepEqual(resolvePartParam("0", 5), { part: 1, redirectTo: 1 });
    assert.deepEqual(resolvePartParam("03", 5), { part: 3, redirectTo: 3 });
    assert.deepEqual(resolvePartParam("abc", 5), { part: 1, redirectTo: 1 });
    assert.deepEqual(resolvePartParam(["2", "4"], 5), { part: 2, redirectTo: null });
  });

  it("builds part URLs", () => {
    assert.equal(partHref("/trilhas/t/m", 3), "/trilhas/t/m?parte=3");
    assert.equal(partHref("/trilhas/t/m", 2, "tarefa-x"), "/trilhas/t/m?parte=2#tarefa-x");
  });
});

// ---------------------------------------------------------------------------
// Every real module: the parts add up to the whole, in the source and in the
// rendered output, and every graded task lands in exactly one part.

const root = path.resolve(import.meta.dirname, "..");
const moduleFiles = fs
  .readdirSync(path.join(root, "content"), { withFileTypes: true })
  .filter((track) => track.isDirectory())
  .flatMap((track) =>
    fs.readdirSync(path.join(root, "content", track.name)).map((slug) => `content/${track.name}/${slug}/index.mdx`),
  )
  .filter((file) => fs.existsSync(path.join(root, file)))
  .sort();

/** Stand-in for every capitalized JSX component: keeps its name, task and children. */
function stubComponents(nodes: RootContent[]) {
  const names = new Set<string>();
  const walk = (node: unknown) => {
    const n = node as { type?: string; name?: string | null; children?: unknown[] };
    if ((n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") && n.name && /^[A-Z]/.test(n.name)) {
      names.add(n.name);
    }
    for (const child of n.children ?? []) walk(child);
  };
  nodes.forEach(walk);
  return Object.fromEntries(
    [...names].map((name) => [
      name,
      ({ task, children }: { task?: string; children?: ReactNode }) =>
        createElement(`x-${name.toLowerCase()}`, { "data-task": task }, children),
    ]),
  );
}

/**
 * Compiles the module with the same remark plugins as next.config.ts. Image
 * imports (`import x from "./img/x.svg"`) become string constants, in memory
 * only, because Node cannot import SVG files.
 */
async function compileModule(source: string, preambleEnd: number) {
  // Dynamic import: @mdx-js/mdx pulls ESM-only packages that the CJS test
  // runner cannot require().
  const { evaluate } = await import("@mdx-js/mdx");
  const preamble = source
    .slice(0, preambleEnd)
    .replace(/^import (\w+) from (["'][^"']+["']);?$/gm, "export const $1 = $2;");
  const { default: Content } = await evaluate(preamble + source.slice(preambleEnd), {
    ...runtime,
    remarkPlugins: [remarkGfm, [remarkFrontmatter, ["yaml"]]],
  });
  return Content;
}

const html = (nodes: ReactNode[]) => renderToStaticMarkup(createElement(Fragment, null, ...nodes));

describe("pagination of every module in content/", () => {
  it("finds the modules", () => {
    assert.ok(moduleFiles.length >= 59, `only ${moduleFiles.length} modules found`);
  });

  for (const file of moduleFiles) {
    it(file, async () => {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      const plan = planModulePages(source);
      const nodes = parseModuleTree(source).children;
      const start = (n: RootContent) => n.position!.start.offset!;
      const { parts } = plan;
      assert.ok(parts.length > 0, "no parts");

      // 1. Source: preamble + parts, contiguous, add up to the exact file.
      assert.equal(parts[0].start, plan.preambleEnd);
      parts.forEach((p, i) => {
        assert.equal(p.number, i + 1);
        assert.ok(p.end > p.start, `part ${p.number} is empty`);
        if (i > 0) assert.equal(p.start, parts[i - 1].end, `gap or overlap before part ${p.number}`);
      });
      assert.equal(parts.at(-1)!.end, source.length);
      assert.equal(joined(source, plan), source);

      // 2. The preamble renders nothing (front-matter and imports only).
      for (const node of nodes.filter((n) => start(n) < plan.preambleEnd)) {
        assert.ok(isPreambleNode(node), `visible ${node.type} before the first part`);
      }

      // 3. Every ## opens a part; continuations open at a ###.
      const nodeAt = new Map(nodes.map((n) => [start(n), n]));
      const h2Starts = nodes.filter((n) => n.type === "heading" && n.depth === 2).map(start);
      assert.deepEqual(
        parts.filter((p) => !p.continuation).map((p) => p.start),
        h2Starts,
      );
      for (const p of parts.filter((q) => q.continuation)) {
        const first = nodeAt.get(p.start);
        assert.ok(first?.type === "heading" && first.depth === 3, `part ${p.number} does not start at a ###`);
      }

      // 4. Size: over the limit only when the part is one indivisible block,
      // and a section within the limit is never split.
      for (const p of parts) {
        assert.equal(p.words, countWords(source.slice(p.start, p.end)));
        if (p.words <= PART_WORD_LIMIT) continue;
        const innerH3 = nodes.filter(
          (n) => n.type === "heading" && n.depth === 3 && start(n) > p.start && start(n) < p.end,
        );
        assert.equal(innerH3.length, 0, `part ${p.number} has ${p.words} words and could be split`);
      }
      const bySection = Map.groupBy(parts, (p) => p.boundary.h2);
      for (const sectionParts of bySection.values()) {
        if (sectionParts.length < 2) continue;
        const total = countWords(source.slice(sectionParts[0].start, sectionParts.at(-1)!.end));
        assert.ok(total > PART_WORD_LIMIT, `section "${sectionParts[0].sectionTitle}" split without need`);
      }

      // 5. Every flag/quiz task of the front-matter is in exactly one part.
      const { frontmatter } = parseModuleSource(file, source);
      const graded = frontmatter.tasks.filter((t) => t.type === "flag" || t.type === "quiz").map((t) => t.slug);
      assert.deepEqual(parts.flatMap((p) => p.tasks).sort(), [...graded].sort());

      // 6. Rendered: split the real compiled module like the page does; the
      // parts' HTML adds up to the whole module's HTML, byte for byte.
      const Content = await compileModule(source, plan.preambleEnd);
      const tree = Content({ components: stubComponents(nodes) });
      const blocks = mdxTopLevelChildren(tree);
      assert.ok(blocks, "compiled module is not a fragment of blocks");
      const split = splitContentChildren(blocks, plan);
      assert.ok(split, "compiled headings do not match the plan");
      assert.equal(split.length, parts.length);
      const partHtml = split.map(html);
      assert.equal(partHtml.join(""), html(blocks));
      partHtml.forEach((h, i) => {
        assert.ok(h.trim().length > 0, `part ${i + 1} renders nothing`);
        for (const slug of parts[i].tasks) assert.ok(h.includes(`data-task="${slug}"`), `task ${slug} not in part ${i + 1}`);
      });
    });
  }
});
