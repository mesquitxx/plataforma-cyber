"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { GlossaryPageEntry } from "@/db/queries/content";
import { groupByLetter, matchesQuery } from "@/lib/glossary";

/** A–Z glossary with an accent-insensitive filter over terms and definitions. */
export function GlossaryBrowser({ entries }: { entries: GlossaryPageEntry[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const groups = groupByLetter(entries.filter((entry) => matchesQuery(entry, deferredQuery)));
  const shown = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div className="space-y-6">
      <div className="sticky top-12 z-[5] space-y-3 bg-background/95 py-2 backdrop-blur">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar termo ou definição…"
            aria-label="Buscar no glossário"
            className="pl-9"
          />
        </div>
        <nav aria-label="Letras do glossário" className="flex flex-wrap gap-1 font-mono text-xs">
          {groups.map((group) => (
            <a
              key={group.letter}
              href={`#letra-${group.letter === "#" ? "simbolos" : group.letter}`}
              className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {group.letter}
            </a>
          ))}
          <span className="ml-auto self-center text-muted-foreground" role="status" aria-live="polite">
            {shown} de {entries.length} termos
          </span>
        </nav>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum termo encontrado para “{deferredQuery}”.</p>
      )}

      {groups.map((group) => (
        <section
          key={group.letter}
          id={`letra-${group.letter === "#" ? "simbolos" : group.letter}`}
          aria-label={`Letra ${group.letter}`}
          className="scroll-mt-36 space-y-3"
        >
          <h2 className="font-mono text-lg font-semibold text-primary">{group.letter}</h2>
          <dl className="divide-y rounded-lg border bg-card">
            {group.entries.map((entry) => (
              <div key={entry.anchor} id={entry.anchor} className="scroll-mt-36 space-y-1.5 px-4 py-3 target:bg-primary/5">
                <dt className="font-semibold">{entry.term}</dt>
                <dd className="text-sm text-muted-foreground">{entry.definition}</dd>
                {entry.firstModule && (
                  <dd className="text-xs text-muted-foreground">
                    Introduzido em{" "}
                    <Link href={entry.firstModule.href} className="text-foreground underline-offset-4 hover:underline">
                      {entry.firstModule.number} {entry.firstModule.title}
                    </Link>
                    {entry.alsoIn.length > 0 && (
                      <>
                        {" · também aparece em "}
                        {entry.alsoIn.map((m, i) => (
                          <span key={m.href}>
                            {i > 0 && ", "}
                            <Link href={m.href} className="text-foreground underline-offset-4 hover:underline">
                              {m.number}
                            </Link>
                          </span>
                        ))}
                      </>
                    )}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
