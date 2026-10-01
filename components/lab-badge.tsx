import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getLab, isAvailable } from "@/lib/labs/catalog";

/** The module's lab; planned labs (not runnable yet) are shown muted. */
export function LabBadge({ slug }: { slug: string }) {
  const lab = getLab(slug);
  const available = lab !== null && isAvailable(lab);
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-mono", available ? "text-warning" : "text-muted-foreground")}
      title={
        available
          ? "Módulo com laboratório"
          : `Laboratório previsto${lab?.plannedPhase ? ` para a Fase ${lab.plannedPhase}` : ""}`
      }
    >
      <FlaskConical aria-hidden />
      {lab?.title ?? slug}
      {!available && <span className="text-[0.65rem] opacity-80">· previsto</span>}
    </Badge>
  );
}
