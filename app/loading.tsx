import { Skeleton } from "@/components/ui/skeleton";

/** Shown while a page is rendered on the server (Phase 8). */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4" aria-busy="true" aria-live="polite">
      <p className="font-mono text-sm text-primary">
        $ carregando<span className="animate-pulse">…</span>
      </p>
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
