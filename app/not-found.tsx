import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <p className="font-mono text-5xl font-semibold text-primary">404</p>
      <p className="font-mono text-sm text-muted-foreground">
        bash: página não encontrada
      </p>
      <Button asChild variant="outline">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
