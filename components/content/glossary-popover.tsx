"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { termAnchor } from "@/lib/glossary";

type GlossaryPopoverProps = {
  term: string;
  definition: string;
  children: ReactNode;
};

export function GlossaryPopover({ term, definition, children }: GlossaryPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        className="cursor-help rounded-sm text-inherit underline decoration-info decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`${term}: ver definição no glossário`}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm">
        <p className="flex items-center gap-1.5 font-mono text-xs text-info">
          <BookOpenText className="size-3.5" aria-hidden />
          Glossário
        </p>
        <p className="font-semibold">{term}</p>
        <p className="text-muted-foreground">{definition}</p>
        <Link
          href={`/glossario#${termAnchor(term)}`}
          className="font-mono text-xs text-info underline-offset-4 hover:underline"
        >
          ver no glossário →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
