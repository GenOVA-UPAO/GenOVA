import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminUsers } from "../hooks/use-admin-users";
import { AdminUsersPage } from "./admin-users-page";

vi.mock("@/core/auth/auth-store", () => ({
  useCurrentUser: () => ({ id: "me-1", role: "administrador" }),
}));

vi.mock("../hooks/use-admin-users", () => ({
  useAdminUsers: vi.fn(),
}));

vi.mock("../hooks/use-admin-roles", () => ({
  useRoles: () => ({ data: [], isLoading: false, error: null }),
}));

const deactivateUser = vi.fn();

vi.mock("../hooks/use-admin-users-controller", () => ({
  useAdminUsersController: () => ({
    updatingUserId: "",
    isSavingEdit: false,
    isDeactivating: false,
    deactivateUser,
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

function mockUsersQuery(
  overrides: Partial<{
    data: { users: unknown[]; total_pages: number; total_items: number };
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  }> = {},
) {
  vi.mocked(useAdminUsers).mockReturnValue({
    data: { users: [], total_pages: 1, total_items: 0 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useAdminUsers>);
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersQuery();
  });

  it("muestra el estado vacío cuando no hay usuarios", () => {
    render(<AdminUsersPage />);

    expect(screen.getByText("No hay usuarios")).toBeInTheDocument();
    expect(
      screen.getByText("Cuando se registren en la plataforma aparecerán aquí."),
    ).toBeInTheDocument();
  });

  it("pide confirmación antes de desactivar una cuenta", async () => {
    mockUsersQuery({
      data: {
        users: [
          {
            id: "u-1",
            email: "docente@upao.edu.pe",
            full_name: "Docente Uno",
            role: { id: "r-1", name: "profesor" },
            is_active: true,
          },
        ],
        total_pages: 1,
        total_items: 1,
      },
    });
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await user.click(screen.getByRole("button", { name: "Más acciones para Docente Uno" }));
    await user.click(await screen.findByRole("menuitem", { name: "Desactivar cuenta" }));

    expect(deactivateUser).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Desactivar la cuenta de Docente Uno?");

    await user.click(within(dialog).getByRole("button", { name: "Desactivar cuenta" }));
    expect(deactivateUser).toHaveBeenCalledWith("u-1", expect.any(Function));
  });

  it("muestra el error en español y reintenta con refetch", async () => {
    const refetch = vi.fn();
    mockUsersQuery({ error: new Error("ECONNREFUSED"), refetch });

    const user = userEvent.setup();
    render(<AdminUsersPage />);

    expect(screen.getByText("No se pudieron cargar los usuarios")).toBeInTheDocument();
    expect(screen.queryByText("ECONNREFUSED")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });
});
