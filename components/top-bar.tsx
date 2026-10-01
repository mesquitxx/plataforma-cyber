import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur">
      <SidebarTrigger aria-label="Alternar menu lateral" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />

      <Badge variant="outline" className="gap-1 font-mono text-primary">
        <ShieldCheck />
        127.0.0.1 · offline
      </Badge>

      {/* Placeholder: real lab status arrives in Phase 5. */}
      <div className="ml-auto flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-muted-foreground/60" aria-hidden />
        Lab: — parado
      </div>
    </header>
  );
}
