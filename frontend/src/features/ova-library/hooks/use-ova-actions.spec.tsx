import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ovaLibraryApi } from "../api/ova-library.api";
import { useOvaActions } from "./use-ova-actions";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock("../api/ova-library.api", () => ({ ovaLibraryApi: { batchMoveToTrash: vi.fn() } }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(useOvaActions, { wrapper });
}

describe("useOvaActions · mover a la papelera por lote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cuenta solo los OVAs movidos y avisa de los omitidos", async () => {
    vi.mocked(ovaLibraryApi.batchMoveToTrash).mockResolvedValue({ moved: ["a", "b"], skipped: ["c"] });
    const { result } = setup();
    await act(() => result.current.batchMoveToTrash(["a", "b", "c"]));
    expect(toast.success).toHaveBeenCalledWith("2 OVAs movidos a la papelera");
    expect(toast.warning).toHaveBeenCalledWith(
      "1 OVA omitido: cambió de estado o ya no está disponible",
    );
  });

  it("sin omitidos no muestra aviso", async () => {
    vi.mocked(ovaLibraryApi.batchMoveToTrash).mockResolvedValue({ moved: ["a"], skipped: [] });
    const { result } = setup();
    await act(() => result.current.batchMoveToTrash(["a"]));
    expect(toast.success).toHaveBeenCalledWith("1 OVA movido a la papelera");
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
