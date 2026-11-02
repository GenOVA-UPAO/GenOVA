import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ovaLibraryApi } from "../api/ova-library.api";
import { useTrashActions } from "./use-trash-actions";

const trashIds = vi.hoisted(() => vi.fn<() => Promise<string[]>>());

vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock("../api/ova-library.api", () => ({
  ovaLibraryApi: { batchRestore: vi.fn(), batchDeleteForever: vi.fn(), trashIds },
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(useTrashActions, { wrapper });
}

const SKIPPED_ONE = "1 OVA omitido: cambió de estado o ya no está disponible";

describe("useTrashActions · acciones por lote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restaurar cuenta solo los restaurados y avisa de los omitidos", async () => {
    vi.mocked(ovaLibraryApi.batchRestore).mockResolvedValue({ restored: ["a", "b"], skipped: ["c"] });
    const { result } = setup();
    await act(() => result.current.batchRestore(["a", "b", "c"]));
    expect(toast.success).toHaveBeenCalledWith("2 OVAs restaurados");
    expect(toast.warning).toHaveBeenCalledWith(SKIPPED_ONE);
  });

  it("eliminar cuenta solo los eliminados y avisa de los omitidos", async () => {
    vi.mocked(ovaLibraryApi.batchDeleteForever).mockResolvedValue({ deleted: ["a", "b"], skipped: ["c"] });
    const { result } = setup();
    await act(() => result.current.batchDeleteForever(["a", "b", "c"]));
    expect(toast.success).toHaveBeenCalledWith("2 OVAs eliminados definitivamente");
    expect(toast.warning).toHaveBeenCalledWith(SKIPPED_ONE);
  });

  it("si todo se omite, no anuncia un éxito vacío", async () => {
    vi.mocked(ovaLibraryApi.batchRestore).mockResolvedValue({ restored: [], skipped: ["a"] });
    const { result } = setup();
    await act(() => result.current.batchRestore(["a"]));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(SKIPPED_ONE);
  });

  it("vaciar la papelera informa los eliminados de verdad", async () => {
    trashIds.mockResolvedValue(["a", "b", "c"]);
    vi.mocked(ovaLibraryApi.batchDeleteForever).mockResolvedValue({ deleted: ["a", "b"], skipped: ["c"] });
    const { result } = setup();
    await act(() => result.current.emptyTrash());
    expect(toast.success).toHaveBeenCalledWith("Papelera vaciada: 2 OVAs eliminados");
    expect(toast.warning).toHaveBeenCalledWith(SKIPPED_ONE);
  });
});
