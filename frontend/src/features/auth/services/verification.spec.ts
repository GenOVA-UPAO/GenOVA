import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<Response>>());
vi.mock("@/core/lib/http", () => ({ apiFetch }));

import { resendVerification, verifyEmail } from "./verification";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: () => Promise.resolve(body) } as unknown as Response;
}

describe("verification service", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("verifies the email against the /api/auth prefix the backend mounts", async () => {
    apiFetch.mockResolvedValue(jsonResponse({ message: "ok" }));
    await verifyEmail("tok-12345678");
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/auth/verify-email",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces the backend message when the token is rejected", async () => {
    apiFetch.mockResolvedValue(jsonResponse({ message: "Enlace caducado." }, false));
    await expect(verifyEmail("tok-12345678")).rejects.toThrow("Enlace caducado.");
  });

  it("resends the link against /api/auth/resend-verification", async () => {
    apiFetch.mockResolvedValue(jsonResponse({ message: "Enviado." }));
    await expect(resendVerification("a@example.com")).resolves.toBe("Enviado.");
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/auth/resend-verification",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
