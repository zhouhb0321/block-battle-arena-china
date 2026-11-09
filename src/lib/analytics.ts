// Lightweight PostHog capture without an SDK dependency.
// No key configured -> every call is a no-op.
type Props = Record<string, unknown>;

const KEY = (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ?? "";
const HOST = ((import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com").replace(/\/$/, "");
const ID_KEY = "bb_anon_id";

function newId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  } catch {
    return `anon_${Date.now()}`;
  }
}

function loadAnonId(): string {
  try {
    const existing = localStorage.getItem(ID_KEY);
    if (existing) return existing;
    const id = newId();
    localStorage.setItem(ID_KEY, id);
    return id;
  } catch {
    return newId();
  }
}

let distinctId = loadAnonId();

export function capture(event: string, properties: Props = {}): void {
  if (!KEY) return;
  const payload = {
    api_key: KEY,
    event,
    properties: { distinct_id: distinctId, $lib: "blockbattle-web", ...properties },
    timestamp: new Date().toISOString(),
  };
  try {
    void fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // analytics must never break gameplay
  }
}

export function identify(userId: string, properties: Props = {}): void {
  distinctId = userId;
  capture("$identify", { $set: properties });
}

export function initAnalytics(): void {
  if (!KEY) return;
  capture("$pageview", { $current_url: window.location.href, path: window.location.pathname });
}
