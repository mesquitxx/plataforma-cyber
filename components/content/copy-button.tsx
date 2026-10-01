"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard denied: the code stays selectable by hand.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={copy}
      aria-label={copied ? "Copiado" : "Copiar"}
      title={copied ? "Copiado" : "Copiar"}
      className="text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="text-primary" aria-hidden /> : <Copy aria-hidden />}
    </Button>
  );
}
