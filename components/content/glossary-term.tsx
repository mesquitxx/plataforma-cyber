import type { ReactNode } from "react";
import { getGlossary, getModuleGlossary } from "@/db/queries/content";
import { GlossaryPopover } from "./glossary-popover";

type GlossaryTermProps = {
  /** Term as declared in some module's front-matter (case-insensitive). */
  term: string;
  /** Text shown in the sentence; defaults to the term itself. */
  children?: ReactNode;
};

/**
 * Marks a technical term in the text; click (or Enter) opens its definition.
 * The text around it must still explain the term on first use: the popover
 * is a reminder, not the explanation (docs/PADRAO-DE-MODULO.md).
 */
export function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const entry = getGlossary().get(term.trim().toLowerCase());
  const label = children ?? term;
  // Not ingested yet: plain text, never a broken page.
  if (!entry) return <span title="Termo ainda não ingerido (npm run content:ingest)">{label}</span>;
  return (
    <GlossaryPopover term={entry.term} definition={entry.definition}>
      {label}
    </GlossaryPopover>
  );
}

/** Section 10 of every module: the terms this module introduced. */
export function ModuleGlossary({ moduleSlug }: { moduleSlug?: string }) {
  const terms = moduleSlug ? getModuleGlossary(moduleSlug) : [];
  if (terms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum termo ingerido para este módulo ainda (npm run content:ingest).
      </p>
    );
  }
  return (
    <dl className="not-prose my-6 divide-y rounded-lg border bg-card">
      {terms.map(({ term, definition }) => (
        <div key={term} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="font-mono text-sm text-primary">{term}</dt>
          <dd className="text-sm text-muted-foreground">{definition}</dd>
        </div>
      ))}
    </dl>
  );
}
