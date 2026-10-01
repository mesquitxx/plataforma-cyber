import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LabTarget } from "@/db/schema";

const LAB_TARGET_LABELS: Record<LabTarget, string> = {
  dvwa: "DVWA",
  "juice-shop": "Juice Shop",
  webgoat: "WebGoat",
  vulhub: "Vulhub",
};

export function LabBadge({ target }: { target: LabTarget }) {
  return (
    <Badge variant="outline" className="gap-1 font-mono text-warning" title="Módulo com laboratório">
      <FlaskConical aria-hidden />
      {LAB_TARGET_LABELS[target]}
    </Badge>
  );
}
