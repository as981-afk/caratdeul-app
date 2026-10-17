// Minimal error reporting hook-up for the ErrorBoundary.
//
// In development (or when no DSN is configured) errors are only logged to the
// console. In production, set VITE_SENTRY_DSN and crashes are forwarded to
// Sentry's store endpoint — no SDK required, so the bundle stays small.
//
// Only a stack trace + component stack are sent: no usernames, no stored
// data, no URLs beyond what the stack itself contains.

function parseDsn(dsn) {
  try {
    const u = new URL(dsn);
    const key = u.username;
    const host = u.hostname + (u.port ? `:${u.port}` : "");
    const projectId = u.pathname.replace(/^\/+/, "");
    if (!key || !host || !projectId) return null;
    const proto = u.protocol === "http:" ? "http:" : "https:";
    return {
      endpoint: `${proto}//${host}/api/${projectId}/store/`,
      key,
      projectId,
    };
  } catch {
    return null;
  }
}

function toEvent(error, extra) {
  const event = {
    platform: "javascript",
    level: "error",
    timestamp: new Date().toISOString(),
    environment: import.meta.env.MODE || "production",
    release: import.meta.env.VITE_APP_VERSION || "caratdeul",
    logger: "javascript",
    exception: {
      values: [
        {
          type: error?.name || "Error",
          value: error?.message || String(error),
          stacktrace: error?.stack
            ? { frames: String(error.stack).split("\n").map((line) => ({ function: line.trim() })) }
            : undefined,
        },
      ],
    },
    extra,
  };
  return event;
}

export function reportError(error, extra = {}) {
  // Always keep the local signal — it is the only feedback without a DSN.
  console.error("CARATFLIX crashed:", error, extra);

  const dsn = parseDsn(import.meta.env.VITE_SENTRY_DSN || "");
  if (!dsn) return;

  try {
    const body = JSON.stringify(toEvent(error, extra));
    const auth =
      `Sentry sentry_version=7, sentry_client=caratdeul/1.0, sentry_key=${dsn.key}`;
    // sendBeacon keeps the request alive even if the page is being torn down.
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(`${dsn.endpoint}?sentry_key=${dsn.key}&sentry_version=7`, blob);
      return;
    }
    fetch(dsn.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sentry-Auth": auth },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* reporting must never throw */
  }
}

export default reportError;
