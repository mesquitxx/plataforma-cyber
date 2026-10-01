import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Laboratórios" };

export default function LabsPage() {
  return (
    <EmptyState
      icon={FlaskConical}
      title="Laboratórios"
      description="Ligar e desligar alvos isolados (DVWA, Juice Shop, WebGoat, Vulhub), um por vez, sempre em 127.0.0.1."
      phase="Fase 6"
    />
  );
}
