import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ResourceConfigModal from "./resource-config-modal";

describe("ResourceConfigModal", () => {
  it("shows the range error under the field instead of saving an invalid value", () => {
    const onSave = vi.fn();
    render(
      <ResourceConfigModal
        phase="engage"
        resourceId="1"
        resourceName="Cómic interactivo"
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    const field = screen.getByLabelText("Viñetas");
    expect(screen.queryByText(/Escribe un número entero/)).not.toBeInTheDocument();
    fireEvent.change(field, { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Escribe un número entero entre 3 y 8.")).toBeVisible();
  });

  it("saves numbers within range", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<ResourceConfigModal phase="engage" resourceId="1" onSave={onSave} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Viñetas"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));
    expect(onSave).toHaveBeenCalledWith({ num_panels: 6 });
    expect(onClose).toHaveBeenCalled();
  });
});
