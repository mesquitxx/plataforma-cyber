"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize, RefreshCw } from "lucide-react";
import { openDesktop } from "@/app/laboratorios/actions";
import { Button } from "@/components/ui/button";

/**
 * The Kali desktop, through Guacamole on 127.0.0.1:8080, embedded in an
 * iframe (security trade-off T2 in docs/LABORATORIO.md). The URL comes from
 * the server and carries a session token of the restricted Guacamole user
 * "plataforma"; the password never reaches the browser.
 */
export function KaliDesktop({ slug }: { slug: string }) {
  const frameBox = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; url: string | null; error: string | null } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    openDesktop({ lab: slug }).then((r) => {
      if (!cancelled) setResult({ attempt, url: r.ok ? r.url : null, error: r.ok ? null : r.error });
    });
    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  const current = result?.attempt === attempt ? result : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Clique na tela para o teclado ir para o Kali. <kbd className="font-mono">Ctrl+Alt+Shift</kbd> abre o menu do
          Guacamole (área de transferência).
        </p>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void frameBox.current?.requestFullscreen()}
            disabled={!current?.url}
          >
            <Maximize aria-hidden /> Tela cheia
          </Button>
          {current?.url ? (
            <Button size="sm" variant="ghost" asChild>
              <a href={current.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> Nova aba
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled>
              <ExternalLink aria-hidden /> Nova aba
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAttempt((n) => n + 1)}>
            <RefreshCw aria-hidden /> Reconectar
          </Button>
        </div>
      </div>

      <div ref={frameBox} className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        {current?.url ? (
          <iframe
            key={current.url}
            src={current.url}
            title="Desktop do Kali (Guacamole)"
            className="size-full"
            allow="clipboard-read; clipboard-write; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
            referrerPolicy="no-referrer"
          />
        ) : (
          <p className="flex size-full items-center justify-center p-6 text-center font-mono text-xs text-muted-foreground">
            {current?.error ?? "Abrindo o desktop do Kali…"}
          </p>
        )}
      </div>
    </div>
  );
}
