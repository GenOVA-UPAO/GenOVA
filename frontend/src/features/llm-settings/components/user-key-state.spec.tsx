import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserKeyState } from "./user-key-state";

describe("UserKeyState", () => {
  it("una clave personal guardada sin comprobar no afirma conexión", () => {
    render(<UserKeyState view={{ kind: "saved" }} />);
    expect(screen.getByText("Sin verificar")).toBeVisible();
    expect(screen.queryByText("Conectado")).toBeNull();
  });
  it("si el proveedor no responde la clave personal sigue sin verificar", () => {
    render(<UserKeyState view={{ kind: "error", code: "unreachable" }} />);
    expect(screen.getByText("Sin verificar")).toBeVisible();
    expect(screen.queryByText("Conectado")).toBeNull();
  });
});
