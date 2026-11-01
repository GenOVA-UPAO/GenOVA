import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import i18n from "i18next";
import type { PropsWithChildren } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LtiPlatformPayload } from "../api/admin-lti.api";
import { useDeleteLtiPlatform, useSaveLtiPlatform } from "./use-admin-lti";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../api/admin-lti.api", () => ({
  deleteLtiPlatform: vi.fn(() => Promise.resolve()),
  fetchLtiPlatforms: vi.fn(),
  fetchLtiTool: vi.fn(),
  saveLtiPlatform: vi.fn(() => Promise.resolve({})),
}));

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const payload = {} as LtiPlatformPayload;

describe("use-admin-lti · toasts traducidos", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });
  afterEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("registrar y actualizar avisan en el idioma de la interfaz", async () => {
    const { result } = renderHook(useSaveLtiPlatform, { wrapper });
    await act(() => result.current.mutateAsync({ id: null, payload }));
    expect(toast.success).toHaveBeenLastCalledWith("Platform registered");
    await act(() => result.current.mutateAsync({ id: "p1", payload }));
    expect(toast.success).toHaveBeenLastCalledWith("Platform updated");
  });

  it("eliminar avisa en el idioma de la interfaz", async () => {
    const { result } = renderHook(useDeleteLtiPlatform, { wrapper });
    await act(() => result.current.mutateAsync("p1"));
    expect(toast.success).toHaveBeenLastCalledWith("Platform deleted");
  });
});
