import { Progress } from "@/components/ui/progress";
import type { ProgressSummary } from "@/lib/curriculum-state";
import { cn } from "@/lib/utils";

type ProgressMeterProps = {
  summary: ProgressSummary;
  /** Accessible name of the bar, e.g. "Progresso da Trilha 1". */
  label: string;
  className?: string;
};

export function ProgressMeter({ summary, label, className }: ProgressMeterProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Progress value={summary.percent} aria-label={label} />
      <p className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>
          {summary.completed}/{summary.total} módulos
          {summary.inProgress > 0 && ` · ${summary.inProgress} em andamento`}
        </span>
        <span className={summary.percent === 100 ? "text-primary" : undefined}>
          {summary.percent}%
        </span>
      </p>
    </div>
  );
}
