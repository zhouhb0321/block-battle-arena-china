// Minimal Sentry envelope sender (no SDK). No DSN -> no-op.
const DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined) ?? "";
const RELEASE = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "dev";

type Parsed = { url: string; key: string };

function parseDsn(dsn: string): Parsed | null {
  try {
    const u = new URL(dsn);
    const project = u.pathname.replace(/^\//, "");
    if (!u.username || !project) return null;
    return { url: `${u.protocol}//${u.host}/api/${project}/store/`, key: u.username };
  } catch {
    return null;
  }
}

function eventId(): string {
  const raw = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`;
  return raw.replace(/-/g, "").slice(0, 32).padEnd(32, "0");
}

function send(message: string, stack?: string, extra: Record<string, unknown> = {}): void {
  const parsed = parseDsn(DSN);
  if (!parsed) return;
  const body = {
    event_id: eventId(),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    release: RELEASE,
    environment: import.meta.env.MODE,
    message,
    extra: { ...extra, stack },
    request: { url: window.location.href, headers: { "User-Agent": navigator.userAgent } },
  };
  try {
    void fetch(parsed.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=blockbattle-web/1.0`,
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // never throw from the error reporter
  }
}

export function captureException(error: unknown, extra: Record<string, unknown> = {}): void {
  if (error instanceof Error) send(error.message, error.stack, extra);
  else send(String(error), undefined, extra);
}

export function initErrorReporting(): void {
  if (!DSN) return;
  window.addEventListener("error", (event) => {
    const err = event.error;
    send(event.message, err instanceof Error ? err.stack : undefined, { source: "window.error" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    send(reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined, { source: "unhandledrejection" });
  });
}
