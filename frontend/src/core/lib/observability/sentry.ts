// Optional Sentry error tracking for the Angular frontend.
//
// Enabled when `window.__GENOVA_SENTRY_DSN__` is set before bootstrap (inject at deploy
// time via index.html script or server-side HTML substitution from GENOVA_SENTRY_DSN).
// Without a DSN, init is skipped — safe for local dev with no config.
//
// DSN is a public client key; never log auth tokens or API secrets here.

declare global {
  interface Window {
    __GENOVA_SENTRY_DSN__?: string;
  }
}

function readDsn(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const dsn = window.__GENOVA_SENTRY_DSN__?.trim();
  return dsn || undefined;
}

const DSN = readDsn();

export function getSentryDsn(): string | undefined {
  return DSN;
}

export function isSentryEnabled(): boolean {
  return Boolean(DSN);
}

/** Initialize Sentry before `bootstrapApplication`. Resolves immediately when disabled. */
export function initSentry(): Promise<void> {
  if (!DSN) return Promise.resolve();
  return import("@sentry/angular")
    .then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        environment: location.hostname === "localhost" ? "development" : "production",
        sendDefaultPii: false,
        tracesSampleRate: 0,
      });
    })
    .catch(() => {
      /* Sentry load failure must not break the app */
    });
}

/** Report a captured exception to Sentry. No-op when disabled. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN || !error) return;
  import("@sentry/angular")
    .then((Sentry) => {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    })
    .catch(() => {
      /* reporting must not throw */
    });
}
