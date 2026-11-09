"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CornerDownRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PartMenuItem = {
  number: number;
  href: string;
  sectionTitle: string;
  subtitle: string | null;
  hasTasks: boolean;
};

/** "Parte X de Y" button that opens the list of every part of the module. */
export function ModulePartMenu({ parts, current }: { parts: PartMenuItem[]; current: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="font-mono text-xs" aria-label={`Parte ${current} de ${parts.length}: ver todas as partes`}>
          Parte {current} de {parts.length}
          <ChevronDown aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[min(26rem,calc(100vw-2rem))] p-1.5">
        <nav aria-label="Partes do módulo">
          <ol className="max-h-[60vh] space-y-0.5 overflow-y-auto">
            {parts.map((part) => {
              const active = part.number === current;
              return (
                <li key={part.number}>
                  <Link
                    href={part.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                      active && "bg-accent font-medium",
                    )}
                  >
                    <span className="w-6 shrink-0 pt-px text-right font-mono text-xs text-muted-foreground">
                      {part.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      {part.subtitle ? (
                        <span className="flex items-start gap-1 text-muted-foreground">
                          <CornerDownRight className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          <span>
                            <span className="sr-only">{part.sectionTitle}, continuação: </span>
                            {part.subtitle}
                          </span>
                        </span>
                      ) : (
                        part.sectionTitle
                      )}
                    </span>
                    {part.hasTasks && (
                      <Flag className="mt-0.5 size-3.5 shrink-0 text-primary" aria-label="tem tarefa (flag ou quiz)" role="img" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
