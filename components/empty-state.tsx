import { Construction, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  /** Roadmap phase that delivers this page, e.g. "Fase 4". */
  phase: string;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, phase, icon: Icon = Construction }: EmptyStateProps) {
  return (
    <Card className="mx-auto w-full max-w-xl border-dashed">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2 text-warning">
          <Icon className="size-5" aria-hidden />
          <Badge variant="outline" className="border-warning/40 font-mono text-warning">
            Em construção · {phase}
          </Badge>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="font-mono text-xs text-muted-foreground">
        Veja o ROADMAP.md para o que vem em cada fase.
      </CardContent>
    </Card>
  );
}
