import type { ReactNode } from "react";
import { ChevronRight, KeyRound, Lightbulb } from "lucide-react";

type RevealProps = {
  /** Shown on the closed block, e.g. "Dica 1". */
  title?: string;
  children: ReactNode;
};

/**
 * Collapsed by default, so whoever wants to think can think, and whoever is
 * stuck can open it (docs/PADRAO-DE-MODULO.md, "Dicas escondidas").
 */
function Reveal({
  title,
  icon: Icon,
  className,
  children,
}: RevealProps & { title: string; icon: typeof Lightbulb; className: string }) {
  return (
    <details className={`group my-4 rounded-lg border ${className}`}>
      <summary className="not-prose flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          aria-hidden
        />
        <Icon className="size-4 shrink-0" aria-hidden />
        {title}
      </summary>
      <div className="border-t px-4 py-1 [&>:first-child]:mt-3 [&>:last-child]:mb-3">{children}</div>
    </details>
  );
}

export function Hint({ title = "Dica", children }: RevealProps) {
  return (
    <Reveal title={title} icon={Lightbulb} className="border-primary/30 text-primary [&>div]:text-foreground">
      {children}
    </Reveal>
  );
}

export function Solution({ title = "Solução", children }: RevealProps) {
  return (
    <Reveal title={title} icon={KeyRound} className="border-warning/30 text-warning [&>div]:text-foreground">
      {children}
    </Reveal>
  );
}
