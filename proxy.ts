/**
 * Host and Origin guard (DNS rebinding and cross-site requests).
 *
 * The server only listens on 127.0.0.1, but a malicious page open in the
 * browser could point its own domain at 127.0.0.1 and talk to this app.
 * Such requests carry a foreign Host header, so anything that is not an
 * explicit local origin gets a 403. Since Phase 6 the platform controls
 * Docker, so two more rules apply (security trade-off T1 in
 * docs/LABORATORIO.md):
 * - X-Forwarded-Host must equal Host. Next.js sets it itself (to the Host),
 *   and trusts it over Host when checking a Server Action's Origin, so a
 *   forged value (there is no reverse proxy here) is refused;
 * - every request that is not GET/HEAD (Server Actions are POSTs) must carry
 *   a local Origin. Next.js checks Origin against Host too; this is the same
 *   rule, enforced before any route or action runs.
 *
 * No `matcher`: the guard runs on every request, static assets included.
 */
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_HOSTS = new Set(["127.0.0.1:3000", "localhost:3000"]);
const ALLOWED_ORIGINS = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);
const SAFE_METHODS = new Set(["GET", "HEAD"]);

function forbidden(reason: string) {
  return new NextResponse(`Forbidden: ${reason}`, { status: 403 });
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  if (!ALLOWED_HOSTS.has(host)) return forbidden("unexpected Host header");
  const forwardedHost = request.headers.get("x-forwarded-host")?.toLowerCase();
  if (forwardedHost !== undefined && forwardedHost !== host) {
    return forbidden("unexpected X-Forwarded-Host header");
  }

  if (!SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get("origin")?.toLowerCase() ?? "";
    if (!ALLOWED_ORIGINS.has(origin)) return forbidden("unexpected Origin header");
  }
  return NextResponse.next();
}
