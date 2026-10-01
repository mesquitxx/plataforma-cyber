import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PagerLink = { href: string; label: string };

/** Previous/next navigation at the bottom of a page. */
export function Pager({ previous, next }: { previous: PagerLink | null; next: PagerLink | null }) {
  return (
    <nav aria-label="Navegação entre páginas" className="flex flex-wrap justify-between gap-3">
      {previous ? (
        <Button asChild variant="outline">
          <Link href={previous.href}>
            <ArrowLeft aria-hidden />
            {previous.label}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {next && (
        <Button asChild variant="outline">
          <Link href={next.href}>
            {next.label}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
    </nav>
  );
}
