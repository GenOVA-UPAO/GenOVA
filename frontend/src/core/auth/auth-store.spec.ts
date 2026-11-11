import { beforeEach, describe, expect, it } from "vitest";

import { AuthExpiredBus } from "@/core/lib/auth-expired-bus";
import { queryClient } from "@/core/lib/query-client";

import { authStore } from "./auth-store";

describe("authStore y la caché de consultas", () => {
  beforeEach(() => {
    authStore.setUser(null);
    queryClient.clear();
  });

  it("vacía la caché cuando la sesión expira", () => {
    authStore.setUser({ id: "A", role: "docente" });
    queryClient.setQueryData(["profile"], { email: "a@x" });

    AuthExpiredBus.notify();

    expect(queryClient.getQueryData(["profile"])).toBeUndefined();
  });

  it("vacía la caché cuando entra otra cuenta", () => {
    authStore.setUser({ id: "A", role: "docente" });
    queryClient.setQueryData(["profile"], { email: "a@x" });

    authStore.setUser({ id: "B", role: "docente" });

    expect(queryClient.getQueryData(["profile"])).toBeUndefined();
  });

  it("conserva la caché al revalidar la misma cuenta", () => {
    authStore.setUser({ id: "A", role: "docente" });
    queryClient.setQueryData(["profile"], { email: "a@x" });

    authStore.setUser({ id: "A", role: "docente", full_name: "Ana" });

    expect(queryClient.getQueryData(["profile"])).toEqual({ email: "a@x" });
  });
});
