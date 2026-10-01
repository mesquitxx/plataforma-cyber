import { Fragment } from "react";

/**
 * Renders `backticks` in a plain string as inline code. Used where content
 * arrives as a string prop (quiz questions and options) instead of MDX.
 */
export function InlineCode({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
      <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
