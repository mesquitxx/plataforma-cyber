import { Database, FlaskConical, Route } from "lucide-react";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sqlite } from "@/db";
import { getDatabaseStatus } from "@/db/status";

export default async function HomePage() {
  // better-sqlite3 is synchronous: opt out of prerendering so the status is
  // read per request, not frozen at build time.
  await connection();
  const status = getDatabaseStatus(sqlite);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section className="space-y-2">
        <p className="font-mono text-sm text-primary">$ whoami</p>
        <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo ao laboratório</h1>
        <p className="max-w-2xl text-muted-foreground">
          Sua plataforma local para aprender <em>pentest</em> (teste de intrusão: atacar um sistema
          com autorização para encontrar falhas antes de um criminoso), da teoria aos laboratórios
          práticos, tudo isolado no seu computador.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4 text-info" aria-hidden />
              Banco de dados
            </CardTitle>
            <CardDescription>SQLite local, sem servidor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            {status.ok ? (
              <Badge className="bg-primary/15 text-primary">conectado</Badge>
            ) : (
              <Badge variant="destructive">sem schema</Badge>
            )}
            <p className="text-muted-foreground">
              {status.tables.length} tabelas · {status.appliedMigrations} migração(ões)
            </p>
            {!status.ok && (
              <p className="text-warning">Rode: npm run db:migrate</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Route className="size-4 text-info" aria-hidden />
              Trilhas
            </CardTitle>
            <CardDescription>8 trilhas, do zero ao avançado.</CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-xs text-muted-foreground">
            Conteúdo chega na Fase 4.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4 text-info" aria-hidden />
              Laboratório ativo
            </CardTitle>
            <CardDescription>Um laboratório por vez (regra de RAM).</CardDescription>
          </CardHeader>
          <CardContent className="font-mono text-xs text-muted-foreground">
            Controle pela plataforma chega na Fase 5.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
