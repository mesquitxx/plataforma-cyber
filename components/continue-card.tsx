import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { ModuleStateBadge } from "@/components/module-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContinueTarget } from "@/lib/curriculum-state";
import { formatRelativeTime } from "@/lib/format";

export function ContinueCard({ target }: { target: ContinueTarget | null }) {
  if (!target) {
    return (
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PartyPopper className="size-4 text-primary" aria-hidden />
            Currículo concluído
          </CardTitle>
          <CardDescription>Todos os módulos foram concluídos. Hora de revisar!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { module, track, reason } = target;
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <p className="font-mono text-xs text-primary">
          {reason === "in_progress" ? "$ continuar de onde parei" : "$ próximo passo"}
        </p>
        <CardTitle className="text-lg">
          <span className="mr-2 font-mono text-muted-foreground">{module.number}</span>
          {module.title}
        </CardTitle>
        <CardDescription>
          Trilha {track.number} · {track.title}
          {module.updatedAt && ` · atualizado ${formatRelativeTime(module.updatedAt)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <ModuleStateBadge state={module.state} />
        <Button asChild>
          <Link href={module.href}>
            {reason === "in_progress" ? "Continuar" : "Começar"}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
