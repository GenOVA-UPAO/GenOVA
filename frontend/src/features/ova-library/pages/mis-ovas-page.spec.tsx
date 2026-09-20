import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ovaLibraryApi } from "../api/ova-library.api";
import { MisOvasPage } from "./mis-ovas-page";

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

const MOCK_OVAS = [
  {
    id: "ova-1",
    title: "Álgebra Lineal",
    description: "Matrices y vectores",
    status: "listo",
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "ova-2",
    title: "Cálculo Diferencial",
    description: "Límites y derivadas",
    status: "borrador",
    created_at: "2026-03-02T10:00:00Z",
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

describe("MisOvasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite filtrar y buscar OVAs", async () => {
    vi.mocked(ovaLibraryApi.list).mockResolvedValue({
      ovas: MOCK_OVAS,
      total_items: 2,
      total_pages: 1,
    });

    const user = userEvent.setup();
    renderWithProviders(<MisOvasPage />);

    expect(await screen.findByText("Álgebra Lineal")).toBeInTheDocument();
    expect(screen.getByText("Cálculo Diferencial")).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox", {
      name: "Buscar por título de la OVA",
    });
    await user.type(searchInput, "Álgebra");

    await waitFor(
      () => {
        expect(ovaLibraryApi.list).toHaveBeenCalledWith(
          expect.objectContaining({ search: "Álgebra" }),
        );
      },
      { timeout: 1000 },
    );
  });

  it("la acción de mover a papelera invalida la caché de query", async () => {
    vi.mocked(ovaLibraryApi.list).mockResolvedValue({
      ovas: MOCK_OVAS,
      total_items: 2,
      total_pages: 1,
    });
    vi.mocked(ovaLibraryApi.moveToTrash).mockResolvedValue({ message: "ok" });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const user = userEvent.setup();
    renderWithProviders(<MisOvasPage />, queryClient);

    expect(await screen.findByText("Álgebra Lineal")).toBeInTheDocument();

    const trashButtons = screen.getAllByRole("button", { name: "Enviar a papelera" });
    await user.click(trashButtons[0]);

    expect(screen.getByText('¿Mover a la papelera "Álgebra Lineal"?')).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "Mover" });
    await act(async () => {
      await user.click(confirmButton);
    });

    expect(ovaLibraryApi.moveToTrash).toHaveBeenCalledWith("ova-1");
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["ova"] }),
    );
    expect(toast.success).toHaveBeenCalledWith("OVA movido a la papelera");
  });

  it("muestra el estado vacío con acción para crear un OVA", async () => {
    vi.mocked(ovaLibraryApi.list).mockResolvedValue({
      ovas: [],
      total_items: 0,
      total_pages: 1,
    });

    renderWithProviders(<MisOvasPage />);

    expect(await screen.findByText("Aún no has creado ningún OVA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Crear mi primer OVA/ })).toHaveAttribute(
      "href",
      "/crear",
    );
  });

  it("muestra el error en español y reintenta con refetch", async () => {
    vi.mocked(ovaLibraryApi.list).mockRejectedValue(new Error("ECONNREFUSED"));

    const user = userEvent.setup();
    renderWithProviders(<MisOvasPage />);

    expect(await screen.findByText("No se pudo cargar el historial de OVAs")).toBeInTheDocument();
    expect(screen.queryByText("ECONNREFUSED")).not.toBeInTheDocument();

    vi.mocked(ovaLibraryApi.list).mockResolvedValue({
      ovas: [],
      total_items: 0,
      total_pages: 1,
    });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Aún no has creado ningún OVA")).toBeInTheDocument();
  });
});
