"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Error boundary of every page (Phase 8). In production Next.js replaces
 * server error messages with a digest, so only the digest is shown: it
 * matches the log in the terminal running `npm run dev` / `npm start`.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center" role="alert">
      <h1 className="font-mono text-5xl font-semibold text-destructive">erro</h1>
      <p className="font-mono text-sm text-muted-foreground">bash: algo deu errado ao montar esta página</p>
      <p className="text-sm text-muted-foreground">
        Tente de novo. Se continuar, veja a mensagem no terminal onde a plataforma está rodando
        {error.digest ? (
          <>
            {" "}(código <code className="font-mono">{error.digest}</code>)
          </>
        ) : null}
        .
      </p>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Tentar de novo</Button>
        <Button asChild variant="outline">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
