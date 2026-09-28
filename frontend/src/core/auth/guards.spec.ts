import { type LoaderFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authStore } from "./auth-store";
import { requireAdmin, requireAuth, requireGuest } from "./guards";

const args = (url = "http://localhost/dashboard") =>
  ({
    request: new Request(url),
    params: {},
    context: {},
    url: new URL(url),
    pattern: "/",
  }) as unknown as LoaderFunctionArgs;

describe("guards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authStore.setUser(null);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("deja pasar al usuario con sesión", async () => {
    vi.spyOn(authStore, "revalidate").mockResolvedValue({ id: 1, role: "docente" });

    await expect(requireAuth(args())).resolves.toBeNull();
  });

  it("manda a /login con la URL de retorno cuando no hay sesión", async () => {
    vi.spyOn(authStore, "revalidate").mockResolvedValue(null);

    const response = (await requireAuth(args("http://localhost/mis-ovas?page=2")))!;

    expect(response.headers.get("location")).toBe(
      "/login?returnUrl=%2Fmis-ovas%3Fpage%3D2",
    );
  });

  it("con el backend caído manda a /login en vez de romper la ruta", async () => {
    vi.spyOn(authStore, "revalidate").mockRejectedValue(new Error("Failed to fetch"));

    const response = (await requireAuth(args()))!;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("con el backend caído /login muestra el formulario en vez del error boundary", async () => {
    vi.spyOn(authStore, "revalidate").mockRejectedValue(new Error("Failed to fetch"));

    await expect(requireGuest()).resolves.toBeNull();
  });

  it("devuelve al dashboard a quien no es administrador", async () => {
    vi.spyOn(authStore, "revalidate").mockImplementation(() => {
      authStore.setUser({ id: 1, role: "docente" });
      return Promise.resolve(authStore.getUser());
    });

    const response = (await requireAdmin(args("http://localhost/admin")))!;

    expect(response.headers.get("location")).toBe("/dashboard");
  });
});
