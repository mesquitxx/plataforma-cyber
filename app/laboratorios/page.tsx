import type { Metadata } from "next";
import { connection } from "next/server";
import { ShieldCheck } from "lucide-react";
import { LabPanel, type LabUsage } from "@/components/labs/lab-panel";
import { getCurriculum } from "@/db/queries/curriculum";
import { LAB_CATALOG, isAvailable } from "@/lib/labs/catalog";

export const metadata: Metadata = { title: "Laboratórios" };

const GUARANTEES = [
  "Um laboratório ativo por vez (regra de RAM): para trocar, o atual é desligado antes.",
  "Tudo escuta só em 127.0.0.1: a única porta de um lab é a do Guacamole, 127.0.0.1:8080.",
  "Alvos e Kali ficam em redes internas, sem internet e sem rota para o PC ou o Windows.",
  "A plataforma nunca baixa nada: imagens novas só com scripts/lab.sh pull <lab>, no terminal.",
  "Só o servidor local controla o Docker, por uma lista fechada de labs e ações.",
];

export default async function LabsPage() {
  await connection();
  const curriculum = getCurriculum();
  const usage = new Map<string, LabUsage[]>();
  for (const m of curriculum.modules) {
    if (!m.labSlug) continue;
    usage.set(m.labSlug, [...(usage.get(m.labSlug) ?? []), { number: m.number, title: m.title, href: m.href }]);
  }

  const available = LAB_CATALOG.filter(isAvailable);
  const planned = LAB_CATALOG.filter((lab) => !isAvailable(lab));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="space-y-2">
        <p className="font-mono text-sm text-primary">$ ls laboratorios/</p>
        <h1 className="text-3xl font-semibold tracking-tight">Laboratórios</h1>
        <p className="max-w-3xl text-muted-foreground">
          Ligue, desligue e resete os labs daqui ou do painel de cada módulo. Os labs com desktop abrem o Kali no
          navegador; o sandbox abre no terminal do WSL.
        </p>
      </section>

      <section aria-labelledby="garantias" className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <h2 id="garantias" className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
          <ShieldCheck className="size-4" aria-hidden /> Regras de isolamento
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {GUARANTEES.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="disponiveis">
        <h2 id="disponiveis" className="font-mono text-sm text-muted-foreground">
          $ disponíveis
        </h2>
        {available.map((lab) => (
          <LabPanel key={lab.slug} slug={lab.slug} usedBy={usage.get(lab.slug)} />
        ))}
      </section>

      <section className="space-y-4" aria-labelledby="previstos">
        <h2 id="previstos" className="font-mono text-sm text-muted-foreground">
          $ previstos
        </h2>
        {planned.map((lab) => (
          <LabPanel key={lab.slug} slug={lab.slug} usedBy={usage.get(lab.slug)} />
        ))}
      </section>
    </div>
  );
}
