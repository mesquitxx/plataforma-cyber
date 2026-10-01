import Link from "next/link";
import { CalendarClock, FlaskConical, Monitor, TerminalSquare } from "lucide-react";
import { LabControls } from "@/components/labs/lab-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLab, isAvailable } from "@/lib/labs/catalog";

export type LabUsage = { number: string; title: string; href: string };

/**
 * A lab as the catalog describes it (targets, port, RAM, what reset does),
 * plus live controls when it can run now. Planned labs show the phase that
 * brings them, with no controls.
 */
export function LabPanel({ slug, usedBy }: { slug: string; usedBy?: LabUsage[] }) {
  const lab = getLab(slug);
  if (!lab) return null;
  const available = isAvailable(lab);
  const KindIcon = lab.kind === "desktop" ? Monitor : TerminalSquare;

  return (
    <Card id={`lab-${lab.slug}`} className={available ? "border-warning/30" : "border-dashed"}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <FlaskConical className="size-4 text-warning" aria-hidden />
          Laboratório: {lab.title}
          <Badge variant="outline" className="gap-1 font-mono text-[0.7rem] text-muted-foreground">
            <KindIcon aria-hidden />
            {lab.kind === "desktop" ? "desktop Kali" : "sandbox no terminal"}
          </Badge>
          {!available && (
            <Badge variant="outline" className="gap-1 font-mono text-[0.7rem] text-muted-foreground">
              <CalendarClock aria-hidden />
              previsto · Fase {lab.plannedPhase}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{lab.summary}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
          {lab.targets.length > 0 && (
            <>
              <dt className="text-muted-foreground">Alvos (de dentro do Kali)</dt>
              <dd className="font-mono text-xs leading-6">
                {lab.targets.map((t) => (
                  <span key={t.host} className="mr-4 inline-block">
                    {t.url}
                    {t.credentials && <span className="text-muted-foreground"> · {t.credentials}</span>}
                  </span>
                ))}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Porta no PC</dt>
          <dd className="font-mono text-xs leading-6">
            {lab.localPort ? `127.0.0.1:${lab.localPort} (Guacamole)` : "nenhuma"}
          </dd>
          <dt className="text-muted-foreground">Memória</dt>
          <dd className="text-xs leading-6">{lab.ram}</dd>
          {available && (
            <>
              <dt className="text-muted-foreground">Resetar</dt>
              <dd className="text-xs leading-6">{lab.reset}</dd>
            </>
          )}
          {usedBy && usedBy.length > 0 && (
            <>
              <dt className="text-muted-foreground">Usado em</dt>
              <dd className="text-xs leading-6">
                {usedBy.map((m, i) => (
                  <span key={m.href}>
                    {i > 0 && ", "}
                    <Link href={m.href} className="underline-offset-4 hover:underline">
                      <span className="font-mono">{m.number}</span> {m.title}
                    </Link>
                  </span>
                ))}
              </dd>
            </>
          )}
        </dl>

        {available ? (
          <LabControls slug={lab.slug} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Este laboratório ainda não pode ser ligado: ele chega na Fase {lab.plannedPhase}, junto com o conteúdo
            que o usa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
