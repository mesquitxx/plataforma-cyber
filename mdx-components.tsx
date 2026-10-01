/**
 * Global MDX components (required by @next/mdx in the App Router). Module
 * MDX uses these names without importing them; see docs/TEMPLATE-MODULO.mdx.
 * The module page overrides FlagInput and ModuleGlossary to bind the module.
 */
import type { ComponentPropsWithoutRef } from "react";
import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Callout } from "@/components/content/callout";
import { CodeBlock, MdxPre } from "@/components/content/code-block";
import { Figure } from "@/components/content/figure";
import { FlagInput } from "@/components/content/flag-input";
import { GlossaryTerm, ModuleGlossary } from "@/components/content/glossary-term";
import { Quiz } from "@/components/content/quiz";
import { Hint, Solution } from "@/components/content/reveal";

function Anchor({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
        <ExternalLink className="ml-0.5 inline size-3 align-baseline" aria-label="(abre em nova aba)" />
      </a>
    );
  }
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

function Table(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-6 overflow-x-auto">
      <table {...props} className="my-0" />
    </div>
  );
}

const components = {
  a: Anchor,
  pre: MdxPre,
  table: Table,
  Callout,
  CodeBlock,
  Figure,
  FlagInput,
  GlossaryTerm,
  Hint,
  ModuleGlossary,
  Quiz,
  Solution,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
