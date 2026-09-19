import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ovaLibraryApi } from "../api/ova-library.api";
import { PapeleraPage } from "./papelera-page";

vi.mock("../api/ova-library.api", () => ({
  ovaLibraryApi: {
    list: vi.fn(),
    trash: vi.fn(),
    trashCount: vi.fn(),
    moveToTrash: vi.fn(),
    restore: vi.fn(),
    deleteForever: vi.fn(),
    batchMoveToTrash: vi.fn(),
    batchRestore: vi.fn(),
    batchDeleteForever: vi.fn(),
    duplicate: vi.fn(),
    updateMetadata: vi.fn(),
    download: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const MOCK_TRASH_OVAS = [
  {
    id: "ova-trash-1",
    title: "Física I",
    description: "Cinemática y dinámica",
    status: "borrador",
    deleted_at: "2026-03-05T12:00:00Z",
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: ReactNode, queryClient = createTestQueryClient()) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe("PapeleraPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite restaurar un OVA de la papelera e invalida la caché", async () => {
    vi.mocked(ovaLibraryApi.trash).mockResolvedValue({
      ovas: MOCK_TRASH_OVAS,
      total_items: 1,
      total_pages: 1,
    });
    vi.mocked(ovaLibraryApi.restore).mockResolvedValue({ message: "ok" });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const user = userEvent.setup();
    renderWithProviders(<PapeleraPage />, queryClient);

    expect(await screen.findByText("Física I")).toBeInTheDocument();
    expect(screen.getByText("1 OVA en papelera")).toBeInTheDocument();

    const restoreButton = screen.getByRole("button", { name: "Restaurar" });
    await act(async () => {
      await user.click(restoreButton);
    });

    expect(ovaLibraryApi.restore).toHaveBeenCalledWith("ova-trash-1");
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["ova"] }),
    );
    expect(toast.success).toHaveBeenCalledWith("OVA restaurado");
  });
});
