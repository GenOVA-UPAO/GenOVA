import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminRolesPage } from "./admin-roles-page";

const mutateMode = vi.fn();
const refetchRoles = vi.fn();

const rolesQuery = {
  data: [] as { id: string; name: string; user_count?: number }[],
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

  it("los roles del sistema no ofrecen editar ni eliminar y lo explican", () => {
    rolesQuery.data = [
      { id: "r-admin", name: "administrador" },
      { id: "r-doc", name: "docente" },
    ];
    render(<AdminRolesPage />);

    const [adminRow, docenteRow] = screen.getAllByTestId("role-row");
    expect(within(adminRow).queryByRole("button")).not.toBeInTheDocument();
    expect(within(adminRow).getByText("Sistema")).toBeInTheDocument();
    expect(within(adminRow).getByText(/no se editan ni se eliminan/)).toBeInTheDocument();
    expect(within(docenteRow).getByRole("button", { name: "Editar permisos" })).toBeInTheDocument();
  });

  it("al eliminar un rol con usuarios pide el rol de destino junto al selector", async () => {
    rolesQuery.data = [
      { id: "r-usr", name: "usuario" },
      { id: "r-doc", name: "docente", user_count: 3 },
    ];
    const user = userEvent.setup();
    render(<AdminRolesPage />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const confirm = screen.getByRole("button", { name: "Reasignar y eliminar" });
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(screen.getByText("Elige a qué rol pasarán sus usuarios.")).toBeInTheDocument();
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
