/**
 * Server-side syntax highlighting with Shiki. Only the languages listed here
 * are bundled, and the JavaScript regex engine avoids loading WebAssembly.
 * Unknown languages fall back to plain text instead of failing the page.
 */
import "server-only";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const THEME = "github-dark-default";

/** Fence names accepted in MDX, mapped to Shiki language ids. */
const LANGUAGE_ALIASES: Record<string, string> = {
  bash: "bash",
  sh: "bash",
  shell: "bash",
  // A terminal session: "$ command" lines followed by their output.
  console: "shellsession",
  terminal: "shellsession",
  python: "python",
  py: "python",
  c: "c",
  sql: "sql",
  http: "http",
  yaml: "yaml",
  json: "json",
  ini: "ini",
  diff: "diff",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  text: "text",
  txt: "text",
};

let highlighter: Promise<HighlighterCore> | null = null;

function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [import("shiki/themes/github-dark-default.mjs")],
    langs: [
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/shellsession.mjs"),
      import("shiki/langs/python.mjs"),
      import("shiki/langs/c.mjs"),
      import("shiki/langs/sql.mjs"),
      import("shiki/langs/http.mjs"),
      import("shiki/langs/yaml.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/ini.mjs"),
      import("shiki/langs/diff.mjs"),
      import("shiki/langs/javascript.mjs"),
      import("shiki/langs/typescript.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

export function resolveLanguage(name: string | undefined): string {
  return LANGUAGE_ALIASES[(name ?? "text").toLowerCase()] ?? "text";
}

/** Returns Shiki's HTML (a <pre class="shiki">), with the code escaped. */
export async function highlight(code: string, language: string): Promise<string> {
  const shiki = await getHighlighter();
  return shiki.codeToHtml(code, { lang: language, theme: THEME });
}
