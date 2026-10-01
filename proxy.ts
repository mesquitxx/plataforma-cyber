/**
 * Host guard against DNS rebinding.
 *
 * The server only listens on 127.0.0.1, but a malicious page open in the
 * browser could point its own domain at 127.0.0.1 and talk to this app.
 * Such requests carry a foreign Host header, so anything that is not an
 * explicit local origin gets a 403. This matters most from Phase 6 on, when
 * the platform controls Docker.
 *
 * No `matcher`: the guard runs on every request, static assets included.
 */
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_HOSTS = new Set(["127.0.0.1:3000", "localhost:3000"]);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  if (!ALLOWED_HOSTS.has(host)) {
    return new NextResponse("Forbidden: unexpected Host header", { status: 403 });
  }
  return NextResponse.next();
}
