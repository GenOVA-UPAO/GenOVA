import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserKeyInput } from "./user-key-input";

describe("UserKeyInput", () => {
  it("evita que el gestor de contraseñas guarde o rellene la clave del proveedor", () => {
    render(
      <UserKeyInput
        id="key-openrouter"
        label="Clave de OpenRouter"
        inputRef={null}
        value=""
        error={null}
        saving={false}
        configured={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Clave de OpenRouter");
    expect(input).toHaveAttribute("autocomplete", "new-password");
    expect(input).toHaveAttribute("data-1p-ignore");
    expect(input).toHaveAttribute("data-lpignore", "true");
  });
});
