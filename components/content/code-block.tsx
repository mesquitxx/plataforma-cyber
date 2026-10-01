import { isValidElement, type ReactNode } from "react";
import { FileCode2, SquareTerminal } from "lucide-react";
import { highlight, resolveLanguage } from "@/lib/highlight";
import { CopyButton } from "./copy-button";

type CodeBlockProps = {
  code: string;
  /** Fence language: bash, console (terminal session), python, sql, text... */
  lang?: string;
  /** Shown in the header instead of the language name, e.g. a file name. */
  title?: string;
};

const SHELL_LANGUAGES = new Set(["bash", "shellsession"]);

/**
 * In a terminal session ("console"), only the commands are copied: the "$ "
 * prompt and the output lines are left out, so the copy can be pasted as is.
 */
function textToCopy(code: string, language: string): string {
  if (language !== "shellsession") return code;
  const commands = code
    .split("\n")
    .filter((line) => /^\$ /.test(line))
    .map((line) => line.slice(2));
  return commands.length > 0 ? commands.join("\n") : code;
}

export async function CodeBlock({ code, lang, title }: CodeBlockProps) {
  const language = resolveLanguage(lang);
  const source = code.replace(/\n$/, "");
  const html = await highlight(source, language);
  const isShell = SHELL_LANGUAGES.has(language);
  const Icon = isShell ? SquareTerminal : FileCode2;
  const label = title ?? (language === "shellsession" ? "terminal" : language);

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-lg border bg-card">
      <figcaption className="flex items-center justify-between gap-2 border-b bg-muted/40 py-1 pr-1 pl-3">
        <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Icon className="size-3.5" aria-hidden />
          {label}
        </span>
        <CopyButton text={textToCopy(source, language)} />
      </figcaption>
      <div
        className="code-block overflow-x-auto text-sm"
        // Shiki escapes the code; the source is versioned content, not user input.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}

/**
 * Adapter for fenced code in MDX, which arrives as <pre><code className=
 * "language-x">...</code></pre>. Anything else is rendered untouched.
 */
export function MdxPre({ children }: { children?: ReactNode }) {
  if (isValidElement<{ className?: string; children?: ReactNode }>(children)) {
    const { className, children: code } = children.props;
    if (typeof code === "string") {
      const lang = /language-(\S+)/.exec(className ?? "")?.[1];
      return <CodeBlock code={code} lang={lang} />;
    }
  }
  return <pre>{children}</pre>;
}
