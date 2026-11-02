import type { ErrorEvent } from "@sentry/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
const captureExceptionMock = vi.fn();
vi.mock("@sentry/react", () => ({ init, captureException: captureExceptionMock }));

import { captureException, initSentry, isSentryEnabled, scrubEvent } from "./sentry";

describe("sentry opcional", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    init.mockReset();
    captureExceptionMock.mockReset();
  });

  it("sin DSN no importa ni inicializa Sentry", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    expect(isSentryEnabled()).toBe(false);
    await initSentry();
    captureException(new Error("x"));
    await Promise.resolve();
    expect(init).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("con DSN inicializa sin replay y con trazas a 0", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://pub@o0.ingest.sentry.io/1");
    await initSentry();
    expect(init).toHaveBeenCalledOnce();
    const opts = init.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(opts.tracesSampleRate).toBe(0);
    expect(opts.replaysSessionSampleRate).toBeUndefined();
    expect(opts.beforeSend).toBe(scrubEvent);
  });

  it("scrubEvent limpia tokens, claves, cabeceras y cuerpos", () => {
    const event = {
      user: { email: "a@b.co" },
      request: { url: "/x", headers: { Authorization: "Bearer abc" }, data: "body" },
      extra: { token: "t", password: "p", note: "ok", msg: "fallo sk-abcdefgh12345" },
    } as unknown as ErrorEvent;
    const out = scrubEvent(event);
    expect(out.user).toBeUndefined();
    expect(out.request).toEqual({ url: "/x", method: undefined });
    expect(out.extra).toEqual({
      token: "[redacted]",
      password: "[redacted]",
      note: "ok",
      msg: "fallo [key]",
    });
  });

  it("scrubEvent quita los tokens de la URL de la página y de los breadcrumbs", () => {
    const event = {
      request: { url: "https://app/reset-password?token=abc123#x", method: "GET" },
      breadcrumbs: [
        { category: "navigation", data: { from: "/login", to: "/reset-password?token=abc123" } },
        { category: "fetch", data: { url: "/api/auth/verify-email?token=abc123", method: "POST" } },
      ],
      extra: { note: "fallo en /verificar-correo?token=abc123&x=1" },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);

    expect(JSON.stringify(out)).not.toContain("abc123");
    expect(out.request?.url).toBe("https://app/reset-password");
    expect(out.breadcrumbs?.[0]?.data).toEqual({ from: "/login", to: "/reset-password" });
  });
});
