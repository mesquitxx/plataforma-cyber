import { TerminalSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SetupHintProps = {
  title: string;
  description: string;
  /** Command(s) to run in the project folder, one per line. */
  commands: string[];
};

export function SetupHint({ title, description, commands }: SetupHintProps) {
  return (
    <Card className="border-dashed border-warning/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-warning">
          <TerminalSquare className="size-4" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="rounded-md bg-muted px-3 py-2 font-mono text-xs">
          {commands.map((command) => `$ ${command}`).join("\n")}
        </pre>
      </CardContent>
    </Card>
  );
}
