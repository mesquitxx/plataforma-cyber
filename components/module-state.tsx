import { CircleCheck, Circle, CirclePlay, Lock, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ModuleState } from "@/lib/curriculum-state";
import { cn } from "@/lib/utils";

export const MODULE_STATE_META: Record<
  ModuleState,
  { label: string; icon: LucideIcon; className: string }
> = {
  completed: { label: "Concluído", icon: CircleCheck, className: "text-primary" },
  in_progress: { label: "Em andamento", icon: CirclePlay, className: "text-info" },
  available: { label: "Disponível", icon: Circle, className: "text-foreground/70" },
  locked: { label: "Bloqueado", icon: Lock, className: "text-muted-foreground" },
};

export function ModuleStateIcon({ state, className }: { state: ModuleState; className?: string }) {
  const { icon: Icon, className: tone, label } = MODULE_STATE_META[state];
  return <Icon className={cn("size-4 shrink-0", tone, className)} aria-label={label} role="img" />;
}

export function ModuleStateBadge({ state }: { state: ModuleState }) {
  const { icon: Icon, className: tone, label } = MODULE_STATE_META[state];
  return (
    <Badge variant="outline" className={cn("gap-1 font-mono", tone)}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
}
