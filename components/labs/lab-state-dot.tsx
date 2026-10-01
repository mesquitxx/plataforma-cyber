import { cn } from "@/lib/utils";
import type { LabRunState } from "@/lib/labs/status";

const DOT_CLASSES: Record<LabRunState, string> = {
  stopped: "bg-muted-foreground/60",
  starting: "bg-info animate-pulse",
  running: "bg-primary",
  degraded: "bg-warning",
};

export function LabStateDot({ state }: { state: LabRunState }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", DOT_CLASSES[state])} aria-hidden />;
}
