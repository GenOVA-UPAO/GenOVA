// Optional Sentry error tracking for the React frontend.
//
// Enabled only when `VITE_SENTRY_DSN` is set at build time (Vercel env var). Without
// it nothing is imported or initialised: no network calls and no bundle cost, because
// `@sentry/react` is loaded with a dynamic `import()` inside the guarded branch.
//
// The DSN is a public client key. Never log auth tokens or API secrets here.

import type { ErrorEvent } from "@sentry/react";

const REDACTED = "[redacted]";
const SENSITIVE_KEY =
  /pass(word|wd)?|secret|token|api[-_]?key|authorization|cookie|prompt|credential/i;
const SECRET_VALUE =
  /\b(?:sk-or|sk|gsk|hf|fal)[-_][A-Za-z0-9_-]{8,}|\bBearer\s+[A-Za-z0-9._-]+|\beyJ[A-Za-z0-9._-]{10,}/g;

function envString(
  name: "VITE_SENTRY_DSN" | "VITE_SENTRY_ENVIRONMENT" | "VITE_SENTRY_RELEASE",
): string | undefined {
  const value = (import.meta.env[name] as string | undefined)?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

export function getSentryDsn(): string | undefined {
  return envString("VITE_SENTRY_DSN");
}

export function isSentryEnabled(): boolean {
  return getSentryDsn() !== undefined;
}

function clean(value: unknown): unknown {
  if (typeof value === "string") return value.replace(SECRET_VALUE, "[key]");
  if (Array.isArray(value)) return value.map(clean);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? REDACTED : clean(v)]),
    );
  }
  return value;
}

/** `beforeSend`: strips tokens, keys, cookies, headers and bodies from the event. */
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  const scrubbed = { ...event };
  delete scrubbed.user;
  if (scrubbed.request) {
    // Se conserva solo lo no sensible (url, method); fuera cabeceras, cookies, cuerpo y query.
    const { url, method } = scrubbed.request;
    scrubbed.request = { url, method };
  }
  for (const key of ["exception", "breadcrumbs", "extra", "contexts", "message"] as const) {
    if (key in scrubbed) (scrubbed as Record<string, unknown>)[key] = clean(scrubbed[key]);
  }
  return scrubbed;
}

/** Initialize Sentry lazily (off the critical path). Resolves immediately when disabled. */
export function initSentry(): Promise<void> {
  const dsn = getSentryDsn();
  if (!dsn) return Promise.resolve();
  return import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment:
          envString("VITE_SENTRY_ENVIRONMENT") ??
          (import.meta.env.MODE === "production" ? "production" : "development"),
        release: envString("VITE_SENTRY_RELEASE"),
        // Sentry 11 reemplazó `sendDefaultPii: false` por `dataCollection`: no enviamos
        // datos de usuario, cookies, cabeceras, cuerpos HTTP ni query params.
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
        },
        // Sin session replay ni trazas por defecto.
        tracesSampleRate: 0,
        beforeSend: scrubEvent,
      });
    })
    .catch(() => {
      /* Sentry load failure must not break the app */
    });
}

/** Report a captured exception to Sentry. No-op when disabled. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!getSentryDsn() || !error) return;
  import("@sentry/react")
    .then((Sentry) => {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    })
    .catch(() => {
      /* reporting must not throw */
    });
}
