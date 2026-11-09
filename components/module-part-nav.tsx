import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ModulePartMenu, type PartMenuItem } from "@/components/module-part-menu";
import { Button } from "@/components/ui/button";

type ModulePartNavProps = {
  parts: PartMenuItem[];
  current: number;
  /** Accessible name; the page has one bar above and one below the content. */
  label: string;
};

/** Previous/next part buttons around the "Parte X de Y" menu. */
export function ModulePartNav({ parts, current, label }: ModulePartNavProps) {
  const previous = parts[current - 2];
  const next = parts[current];
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2 py-1.5">
      {previous ? (
        <Button asChild variant="outline" size="sm">
          <Link href={previous.href} rel="prev">
            <ArrowLeft aria-hidden />
            Anterior
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ArrowLeft aria-hidden />
          Anterior
        </Button>
      )}
      <ModulePartMenu parts={parts} current={current} />
      {next ? (
        <Button asChild variant="outline" size="sm">
          <Link href={next.href} rel="next">
            Próximo
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Próximo
          <ArrowRight aria-hidden />
        </Button>
      )}
    </nav>
  );
}
