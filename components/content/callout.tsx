import type { ReactNode } from "react";
import {
  FlaskConical,
  Info,
  Lightbulb,
  OctagonAlert,
  Scale,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutVariant = "info" | "tip" | "warning" | "danger" | "ethics" | "hypothetical";

const VARIANTS: Record<CalloutVariant, { icon: LucideIcon; label: string; className: string }> = {
  info: { icon: Info, label: "Nota", className: "border-info/40 bg-info/5 [--callout:var(--info)]" },
  tip: { icon: Lightbulb, label: "Dica", className: "border-primary/40 bg-primary/5 [--callout:var(--primary)]" },
  warning: {
    icon: TriangleAlert,
    label: "Atenção",
    className: "border-warning/40 bg-warning/5 [--callout:var(--warning)]",
  },
  danger: {
    icon: OctagonAlert,
    label: "Perigo",
    className: "border-destructive/50 bg-destructive/5 [--callout:var(--destructive)]",
  },
  ethics: {
    icon: Scale,
    label: "Ética e limites",
    className: "border-warning/40 bg-warning/5 [--callout:var(--warning)]",
  },
  // Required label for made-up scenarios (docs/PADRAO-DE-MODULO.md).
  hypothetical: {
    icon: FlaskConical,
    label: "Cenário hipotético",
    className: "border-dashed border-info/50 bg-info/5 [--callout:var(--info)]",
  },
};

type CalloutProps = {
  variant?: CalloutVariant;
  /** Overrides the variant's default title. */
  title?: string;
  children: ReactNode;
};

export function Callout({ variant = "info", title, children }: CalloutProps) {
  const { icon: Icon, label, className } = VARIANTS[variant];
  return (
    <aside
      className={cn(
        "my-6 rounded-lg border px-4 py-3 [&>div>:first-child]:mt-0 [&>div>:last-child]:mb-0",
        className,
      )}
    >
      <p className="not-prose mb-2 flex items-center gap-2 text-sm font-semibold text-(--callout)">
        <Icon className="size-4 shrink-0" aria-hidden />
        {variant === "hypothetical" && title ? `${label}: ${title}` : (title ?? label)}
      </p>
      <div className="text-[0.95em]">{children}</div>
    </aside>
  );
}
