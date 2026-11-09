"use client";

import { useEffect, useRef } from "react";

/**
 * When the module part changes (?parte=N), scroll to the top of the page, or
 * to the #anchor when the link carried one (e.g. a task card in another
 * part). The first render is left alone, so reloads keep the browser's
 * scroll restoration and hash handling.
 */
export function ScrollToPartTop({ part }: { part: number }) {
  const previous = useRef(part);
  useEffect(() => {
    if (previous.current === part) return;
    previous.current = part;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0, left: 0 });
  }, [part]);
  return null;
}
