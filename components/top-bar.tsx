import { ShieldCheck } from "lucide-react";
import { ActiveLabIndicator } from "@/components/labs/active-lab-indicator";
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

      <ActiveLabIndicator />
    </header>
  );
}
