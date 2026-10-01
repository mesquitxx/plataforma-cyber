import Link from "next/link";
import { ProgressMeter } from "@/components/progress-meter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrackView } from "@/lib/curriculum-state";
import { cn } from "@/lib/utils";

type TrackCardProps = {
  track: TrackView;
  /** Show the whole description instead of two lines. */
  fullDescription?: boolean;
};

export function TrackCard({ track, fullDescription = false }: TrackCardProps) {
  return (
    <Link
      href={track.href}
      className="group block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card className="h-full transition-colors group-hover:border-primary/50">
        <CardHeader>
          <p className="font-mono text-xs text-primary">Trilha {track.number}</p>
          <CardTitle className="text-base">{track.title}</CardTitle>
          <CardDescription className={cn(!fullDescription && "line-clamp-2")}>{track.description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <ProgressMeter summary={track.summary} label={`Progresso da Trilha ${track.number}`} />
        </CardContent>
      </Card>
    </Link>
  );
}
