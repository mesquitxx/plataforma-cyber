import type { Metadata } from "next";
import { BookOpenText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Glossário" };

export default function GlossaryPage() {
  return (
    <EmptyState
      icon={BookOpenText}
      title="Glossário"
      description="Termos técnicos em inglês com explicação em português, montado automaticamente a partir dos módulos."
      phase="Fase 4"
    />
  );
}
