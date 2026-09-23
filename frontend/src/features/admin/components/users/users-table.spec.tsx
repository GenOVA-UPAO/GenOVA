import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

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

function renderTable(users: AdminUser[], isCurrentUserAdmin = false) {
  return render(
    <UsersTable
      users={users}
      roles={ROLES}
      currentUserId="me-1"
      isCurrentUserAdmin={isCurrentUserAdmin}
      updatingUserId=""
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
  it("muestra el rol real de cada usuario con su nombre legible (no el primero de la lista)", () => {
    renderTable([TEACHER]);

    const select = screen.getByRole("combobox", { name: "Rol de Docente Uno" });
    expect(select).toHaveTextContent("Profesor");
    expect(select).not.toHaveTextContent("Administrador");
  });

  it("cada fila mantiene su propio rol seleccionado", () => {
    renderTable([TEACHER, STUDENT]);

    expect(screen.getByRole("combobox", { name: "Rol de Docente Uno" })).toHaveTextContent(
      "Profesor",
    );
    expect(screen.getByRole("combobox", { name: "Rol de Alumno Dos" })).toHaveTextContent(
      "Estudiante",
    );
  });

  it("llama a handleRoleChange con el usuario y el rol elegido", async () => {
    const user = userEvent.setup();
    renderTable([TEACHER], true);

    await user.click(screen.getByRole("combobox", { name: "Rol de Docente Uno" }));
    await user.click(await screen.findByRole("option", { name: "Estudiante" }));

    expect(HANDLERS.handleRoleChange).toHaveBeenCalledWith("u-1", "role-student");
  });

  it("en la fila propia el rol y las acciones aparecen deshabilitados", () => {
    renderTable([{ ...TEACHER, id: "me-1" }], true);

    expect(screen.getByRole("combobox", { name: "Rol de Docente Uno" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Acciones no disponibles/ })).toBeDisabled();
  });

  it("ofrece las acciones de cada usuario en un menú «Más acciones»", async () => {
    const user = userEvent.setup();
    renderTable([TEACHER], true);

    await user.click(screen.getByRole("button", { name: "Más acciones para Docente Uno" }));

    expect(await screen.findByRole("menuitem", { name: "Editar perfil" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Desactivar cuenta" })).toBeInTheDocument();
  });

  it("sin código universitario no muestra relleno ni 'null'", () => {
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

    expect(screen.queryByText("--")).not.toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Código /)).not.toBeInTheDocument();
  });

  it("muestra el código con ceros y el teléfono solo cuando existen", () => {
    renderTable([
      {
        id: "u-4",
        email: "concodigo@upao.edu.pe",
        full_name: "Con Código",
        role: { id: "role-teacher", name: "profesor" },
        is_active: true,
        university_id: 257022,
        phone_number: "+51987285992",
      },
    ]);

    expect(screen.getByText("Código 000257022 · +51987285992")).toBeInTheDocument();
  });
});
