import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminRolesPage } from "./admin-roles-page";

const mutateMode = vi.fn();

const ROLE_QUERY = { data: [], isLoading: false, error: null, refetch: vi.fn() };

vi.mock("../hooks/use-admin-roles", () => ({
  useRoles: () => ROLE_QUERY,
  useRegistrationMode: () => ({ data: { default_registration_role: "usuarios_prueba" } }),
  useSetRegistrationMode: () => ({ mutate: mutateMode, isPending: false }),
  useCreateRole: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
  useUpdateRole: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
  useDeleteRole: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));

describe("AdminRolesPage", () => {
  beforeEach(() => {
    mutateMode.mockClear();
  });

  it("el switch de Modo tesis refleja el modo activo y es accesible", () => {
    render(<AdminRolesPage />);

    const toggle = screen.getByRole("switch", { name: "Modo tesis" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Usuarios Prueba/)).toBeInTheDocument();
  });

  it("al desactivar el Modo tesis cambia el rol de registro a usuario", async () => {
    const user = userEvent.setup();
    render(<AdminRolesPage />);

    await user.click(screen.getByRole("switch", { name: "Modo tesis" }));

    expect(mutateMode).toHaveBeenCalledWith("usuario");
  });
});
