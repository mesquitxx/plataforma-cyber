/**
 * Opens the Kali desktop for the embedded Guacamole client (Phase 6,
 * security trade-offs T2 and T3 in docs/LABORATORIO.md).
 *
 * The server logs in to Guacamole's REST API as "plataforma", a user that can
 * only READ the "Kali (attack box)" connection (scripts/lab.sh recreates it on
 * every start). Its password is read from labs/.env here and never leaves the
 * server; the browser only gets a session token, in the iframe URL. Guacamole
 * 1.6 re-authenticates with the URL's `token` parameter (indexRouteConfig
 * calls updateCurrentToken($location.search())), which was verified in the
 * Phase 6 spike.
 */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export const GUACAMOLE_ORIGIN = "http://127.0.0.1:8080";
const GUACAMOLE_BASE = `${GUACAMOLE_ORIGIN}/guacamole`;
const PLATFORM_USER = "plataforma";
const KALI_CONNECTION = "Kali (attack box)";

type Session = { token: string; dataSource: string };

// One cached session per app process (survives hot reloads in `next dev`).
const cache = globalThis as { __cyberlabGuacSession?: Session | null };

async function readPlatformPassword(): Promise<string> {
  const env = await fs.readFile(path.join(process.cwd(), "labs", ".env"), "utf8");
  const match = /^PLATFORM_GUAC_PASSWORD=([A-Za-z0-9]{16,})$/m.exec(env);
  if (!match) throw new Error("PLATFORM_GUAC_PASSWORD is missing from labs/.env (start a lab once)");
  return match[1];
}

async function requestToken(body: URLSearchParams): Promise<Session | null> {
  const response = await fetch(`${GUACAMOLE_BASE}/api/tokens`, {
    method: "POST",
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { authToken: string; dataSource: string };
  return { token: data.authToken, dataSource: data.dataSource };
}

/** Reuses the cached session while Guacamole still accepts it; logs in again otherwise. */
async function getSession(): Promise<Session> {
  const cached = cache.__cyberlabGuacSession;
  if (cached) {
    const renewed = await requestToken(new URLSearchParams({ token: cached.token }));
    if (renewed?.token === cached.token) return cached;
  }
  const session = await requestToken(
    new URLSearchParams({ username: PLATFORM_USER, password: await readPlatformPassword() }),
  );
  if (!session) throw new Error("Guacamole rejected the 'plataforma' login");
  cache.__cyberlabGuacSession = session;
  return session;
}

/** Guacamole's ClientIdentifier: base64url of "<id>\0c\0<dataSource>". */
export function clientIdentifier(connectionId: string, dataSource: string): string {
  return Buffer.from([connectionId, "c", dataSource].join("\0")).toString("base64url");
}

export async function openKaliDesktop(): Promise<{ url: string }> {
  const session = await getSession();
  const response = await fetch(
    `${GUACAMOLE_BASE}/api/session/data/${encodeURIComponent(session.dataSource)}/connections`,
    { headers: { "Guacamole-Token": session.token }, cache: "no-store", signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) throw new Error(`Guacamole connection list failed (${response.status})`);
  const connections = (await response.json()) as Record<string, { identifier: string; name: string }>;
  const kali = Object.values(connections).find((c) => c.name === KALI_CONNECTION);
  if (!kali) throw new Error(`Connection "${KALI_CONNECTION}" not found for ${PLATFORM_USER}`);

  const id = clientIdentifier(kali.identifier, session.dataSource);
  return { url: `${GUACAMOLE_BASE}/#/client/${id}?token=${encodeURIComponent(session.token)}` };
}

/** Forgets the cached session (after the lab stops, Guacamole's sessions are gone anyway). */
export function forgetKaliSession() {
  cache.__cyberlabGuacSession = null;
}
