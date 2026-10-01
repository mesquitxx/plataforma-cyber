import type { Metadata } from "next";
import { Route } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Trilhas" };

export default function TracksPage() {
  return (
    <EmptyState
      icon={Route}
      title="Trilhas de estudo"
      description="As 8 trilhas do currículo, da Pré-Segurança à Consolidação, com módulos, tarefas e progresso."
      phase="Fase 4"
    />
  );
}
