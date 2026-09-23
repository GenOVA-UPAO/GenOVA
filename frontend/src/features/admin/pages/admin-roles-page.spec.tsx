import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminRolesPage } from "./admin-roles-page";

const mutateMode = vi.fn();
const refetchRoles = vi.fn();

const rolesQuery = {
  data: [] as { id: string; name: string }[],
  isLoading: false,
  error: null as Error | null,
  refetch: refetchRoles,
};

vi.mock("../hooks/use-admin-roles", () => ({
  useRoles: () => rolesQuery,
  useRegistrationMode: () => ({ data: { default_registration_role: "usuarios_prueba" } }),
  useSetRegistrationMode: () => ({ mutate: mutateMode, isPending: false }),
  useCreateRole: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
  useUpdateRole: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
  useDeleteRole: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));

describe("AdminRolesPage", () => {
  beforeEach(() => {
    mutateMode.mockClear();
    refetchRoles.mockClear();
    rolesQuery.data = [];
    rolesQuery.isLoading = false;
    rolesQuery.error = null;
  });

  it("el switch de Modo tesis refleja el modo activo y es accesible", () => {
    render(<AdminRolesPage />);

    const toggle = screen.getByRole("switch", { name: "Modo tesis" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/«Usuarios prueba»/)).toBeInTheDocument();
  });

  it("al desactivar el Modo tesis cambia el rol de registro a usuario", async () => {
    const user = userEvent.setup();
    render(<AdminRolesPage />);

    await user.click(screen.getByRole("switch", { name: "Modo tesis" }));

    expect(mutateMode).toHaveBeenCalledWith("usuario");
  });

  it("muestra el estado vacío con acción para crear un rol", () => {
    render(<AdminRolesPage />);

    expect(screen.getByText("Aún no hay roles")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Nuevo rol/ }).length).toBeGreaterThan(0);
  });

  it("muestra el error en español y reintenta con refetch", async () => {
    rolesQuery.error = new Error("ECONNREFUSED");

    const user = userEvent.setup();
    render(<AdminRolesPage />);

    expect(screen.getByText("No se pudieron cargar los roles")).toBeInTheDocument();
    expect(screen.queryByText("ECONNREFUSED")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetchRoles).toHaveBeenCalled();
  });
});
