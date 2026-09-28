import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ovaLibraryApi } from "../api/ova-library.api";
import { DashboardPage } from "./dashboard-page";

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

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  const queryClient = createTestQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pinta el saludo mientras la lista sigue cargando", async () => {
    vi.mocked(ovaLibraryApi.list).mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Bienvenido/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Cargando resumen")).toBeInTheDocument();
    expect(screen.queryByText("Crea tu primer OVA")).not.toBeInTheDocument();
  });

  it("muestra el estado vacío con acción para crear un OVA", async () => {
    vi.mocked(ovaLibraryApi.list).mockResolvedValue({
      ovas: [],
      total_items: 0,
      total_pages: 1,
    });

    renderPage();

    expect(await screen.findByText("Crea tu primer OVA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Comenzar ahora" })).toHaveAttribute("href", "/crear");
  });

  it("muestra el error en español y reintenta con refetch", async () => {
    vi.mocked(ovaLibraryApi.list).mockRejectedValue(new Error("Failed to fetch"));

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("No se pudo cargar el resumen")).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();

    vi.mocked(ovaLibraryApi.list).mockResolvedValue({
      ovas: [],
      total_items: 0,
      total_pages: 1,
    });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Crea tu primer OVA")).toBeInTheDocument();
  });
});
