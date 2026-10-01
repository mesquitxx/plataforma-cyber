import Link from "next/link";
import { LabBadge } from "@/components/lab-badge";
import { MODULE_STATE_META, ModuleStateIcon } from "@/components/module-state";
import type { ModuleView } from "@/lib/curriculum-state";
import { cn } from "@/lib/utils";

export function ModuleRow({ module }: { module: ModuleView }) {
  const locked = module.state === "locked";
  return (
    <li>
      <Link
        href={module.href}
        className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ModuleStateIcon state={module.state} />
        <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{module.number}</span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", locked && "text-muted-foreground")}>
            {module.title}
          </span>
          {locked && (
            <span className="block font-mono text-xs text-muted-foreground">
              Requer: {module.pendingPrerequisites.map((p) => p.number).join(", ")}
            </span>
          )}
        </span>
        {module.labSlug && <LabBadge slug={module.labSlug} />}
        <span className={cn("hidden w-24 text-right text-xs sm:block", MODULE_STATE_META[module.state].className)}>
          {MODULE_STATE_META[module.state].label}
        </span>
      </Link>
    </li>
  );
}
