import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AdminUser, Role, UsersHandlers } from "../../lib/types";
import { UsersTable } from "./users-table";

const ROLES: Role[] = [
  { id: "role-admin", name: "administrador" },
  { id: "role-teacher", name: "profesor", user_count: 1 },
  { id: "role-student", name: "estudiante", user_count: 2 },
];

const HANDLERS: UsersHandlers = {
  handleRoleChange: vi.fn(),
  handleToggleStatus: vi.fn(),
  handleUnlockUser: vi.fn(),
  handleSendResetEmail: vi.fn(),
  openEdit: vi.fn(),
};

function renderTable(users: AdminUser[], isCurrentUserAdmin = false) {
  return render(
    <UsersTable
      users={users}
      roles={ROLES}
      currentUserId="me-1"
      isCurrentUserAdmin={isCurrentUserAdmin}
      updatingUserId=""
      searchQuery=""
      handlers={HANDLERS}
    />,
  );
}

const TEACHER: AdminUser = {
  id: "u-1",
  email: "docente@upao.edu.pe",
  full_name: "Docente Uno",
  role: { id: "role-teacher", name: "profesor" },
  is_active: true,
};

const STUDENT: AdminUser = {
  id: "u-2",
  email: "alumno@upao.edu.pe",
  full_name: "Alumno Dos",
  role: { id: "role-student", name: "estudiante" },
  is_active: true,
};

describe("UsersTable", () => {
  it("muestra el rol real de cada usuario en el selector (no el primero de la lista)", () => {
    renderTable([TEACHER]);

    const select = screen.getByLabelText("Rol de Docente Uno");
    expect(select).toHaveValue("role-teacher");
    expect(select).not.toHaveValue("role-admin");
  });

  it("cada fila mantiene su propio rol seleccionado", () => {
    renderTable([TEACHER, STUDENT]);

    expect(screen.getByLabelText("Rol de Docente Uno")).toHaveValue("role-teacher");
    expect(screen.getByLabelText("Rol de Alumno Dos")).toHaveValue("role-student");
  });

  it("llama a handleRoleChange con el usuario y el rol elegido", async () => {
    const user = userEvent.setup();
    renderTable([TEACHER], true);

    await user.selectOptions(screen.getByLabelText("Rol de Docente Uno"), "role-student");

    expect(HANDLERS.handleRoleChange).toHaveBeenCalledWith("u-1", "role-student");
  });

  it("muestra '--' y nunca 'null' cuando el usuario no tiene código universitario", () => {
    renderTable([
      {
        id: "u-3",
        email: "sincodigo@upao.edu.pe",
        full_name: "Sin Código",
        role: { id: "role-teacher", name: "profesor" },
        is_active: true,
        university_id: null,
        phone_number: null,
      },
    ]);

    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });

  it("muestra el teléfono solo cuando existe", () => {
    renderTable([
      {
        id: "u-4",
        email: "concodigo@upao.edu.pe",
        full_name: "Con Código",
        role: { id: "role-teacher", name: "profesor" },
        is_active: true,
        university_id: null,
        phone_number: "+51987285992",
      },
    ]);

    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.getByText("+51987285992")).toBeInTheDocument();
  });
});
