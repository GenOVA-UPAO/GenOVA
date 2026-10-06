import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PackageThemeSelector } from "./package-theme-selector";

const catalog = vi.hoisted(() => ({
  data: {
    themes: [
      { id: "upao", label: "UPAO", tokens: { bg: "#ffffff", text: "#15233b", primary: "#0a3d91", accent: "#f47a20", action: "#b84b00", "on-action": "#ffffff", border: "#94a3b8", radius: "14px", "font-body": "system-ui" }, css: "" },
      { id: "oscuro", label: "Oscuro", tokens: { bg: "#000000", text: "#ffffff", primary: "#767676", accent: "#ffae60", action: "#767676", "on-action": "#ffffff", border: "#888888", radius: "14px", "font-body": "system-ui" }, css: "" },
    ],
  },
  isError: false,
  refetch: vi.fn(),
}));

vi.mock("./use-package-themes", () => ({ usePackageThemes: () => catalog }));

describe("PackageThemeSelector", () => {
  it("ofrece selección accesible y una muestra del tema guardado", () => {
    const change = vi.fn();
    const { rerender } = render(<PackageThemeSelector value="upao" onChange={change} />);
    const select = screen.getByRole("combobox", { name: "Tema visual" });
    expect(select).toHaveAccessibleDescription("Se aplica a la vista previa y a todos los formatos exportados.");
    fireEvent.change(select, { target: { value: "oscuro" } });
    expect(change).toHaveBeenCalledWith("oscuro");
    rerender(<PackageThemeSelector value="oscuro" onChange={change} />);
    expect(select).toHaveValue("oscuro");
    expect(screen.getByText("Aprender juntos").parentElement).toHaveStyle({ background: "#000000", color: "#ffffff" });
  });

  it("impide cambios mientras se guarda", () => {
    render(<PackageThemeSelector value="upao" onChange={vi.fn()} disabled />);
    expect(screen.getByRole("combobox", { name: "Tema visual" })).toBeDisabled();
  });
});
