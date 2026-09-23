import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { apiJson } from "@/core/lib/http";

import { AdminUsersPage } from "./admin-users-page";

vi.mock("@/core/auth/auth-store", () => ({
  useCurrentUser: () => ({ id: "me-1", role: "administrador" }),
}));

vi.mock("@/core/lib/http", () => ({
  apiJson: vi.fn(),
}));

const ADMIN_ROLE_ID = "11111111-1111-1111-1111-111111111111";

vi.mock("../hooks/use-admin-roles", () => ({
  useRoles: () => ({
    data: [{ id: ADMIN_ROLE_ID, name: "administrador" }],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../hooks/use-admin-users-controller", () => ({
  useAdminUsersController: () => ({
    updatingUserId: "",
    isSavingEdit: false,
    handlers: {
      handleRoleChange: vi.fn(),
      handleToggleStatus: vi.fn(),
      handleUnlockUser: vi.fn(),
      handleSendResetEmail: vi.fn(),
      openEdit: vi.fn(),
    },
    saveEditedUser: vi.fn(),
  }),
}));

const PAGE_USERS = {
  users: [{ id: "p1", email: "alice@example.com", full_name: "Alice Primera" }],
  total_items: 39,
  total_pages: 4,
};

const SERVER_SEARCH_USERS = {
  users: [{ id: "srv-1", email: "from-server@example.com", full_name: "Servidor" }],
  total_items: 1,
  total_pages: 1,
};

beforeAll(() => {
  // jsdom no implementa Pointer Events ni scrollIntoView; Radix Select los usa.
  for (const name of ["hasPointerCapture", "releasePointerCapture", "setPointerCapture"] as const) {
    Object.defineProperty(Element.prototype, name, { configurable: true, value: vi.fn() });
  }
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderPage(ui: ReactNode) {
  return render(<QueryClientProvider client={createTestQueryClient()}>{ui}</QueryClientProvider>);
}

describe("AdminUsersPage búsqueda en servidor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiJson).mockImplementation((path: string) => {
      if (path.includes("search=")) return Promise.resolve(SERVER_SEARCH_USERS);
      return Promise.resolve(PAGE_USERS);
    });
  });

  it("al escribir pide search= al servidor y muestra su resultado, no un filtro local", async () => {
    const user = userEvent.setup();
    renderPage(<AdminUsersPage />);

    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("39 usuarios registrados en la plataforma")).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: /Buscar por nombre o email/i }),
      "admin@genova.ai",
    );

    await waitFor(
      () => {
        expect(apiJson).toHaveBeenCalledWith(
          expect.stringMatching(/search=admin/),
          expect.anything(),
          expect.anything(),
        );
      },
      { timeout: 1500 },
    );

    expect(await screen.findByText("from-server@example.com")).toBeInTheDocument();
    expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("1 usuario registrado en la plataforma")).toBeInTheDocument();
    expect(screen.queryByText("Sin resultados")).not.toBeInTheDocument();
  });

  it("el filtro de rol viaja como role_id en la petición", async () => {
    const user = userEvent.setup();
    renderPage(<AdminUsersPage />);
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Filtrar usuarios por rol" }));
    await user.click(await screen.findByRole("option", { name: "Administrador" }));

    await waitFor(() => {
      expect(apiJson).toHaveBeenCalledWith(
        expect.stringContaining(`role_id=${ADMIN_ROLE_ID}`),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  it("sin coincidencias muestra el vacío del criterio, no el de plataforma vacía", async () => {
    vi.mocked(apiJson).mockImplementation((path: string) => {
      if (path.includes("search=")) {
        return Promise.resolve({ users: [], total_items: 0, total_pages: 1 });
      }
      return Promise.resolve(PAGE_USERS);
    });
    const user = userEvent.setup();
    renderPage(<AdminUsersPage />);
    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: /Buscar por nombre o email/i }), "zzz");

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(screen.getByText("No hay coincidencias para ese criterio.")).toBeInTheDocument();
    expect(screen.queryByText("No hay usuarios")).not.toBeInTheDocument();
    expect(screen.getByText("0 usuarios registrados en la plataforma")).toBeInTheDocument();
  });
});
