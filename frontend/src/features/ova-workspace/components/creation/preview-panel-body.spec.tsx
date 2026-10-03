import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ResourceVM } from "../../lib/ova-job-view-model";
import { PreviewPanelBody } from "./preview-panel-body";

const active: ResourceVM = {
  id: "r1",
  phase: "explain",
  phaseLabel: "Explicación",
  label: "Lectura guiada",
  emoji: "",
  status: "check",
  error_id: null,
  selectable: false,
};

describe("PreviewPanelBody", () => {
  it("muestra un error con reintento en vez de quedarse en blanco", () => {
    const onRetry = vi.fn();
    render(<PreviewPanelBody active={active} loading={false} html="" error onRetry={onRetry} />);
    expect(screen.getByRole("alert").textContent).toContain("No se pudo cargar");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("muestra el esqueleto mientras carga", () => {
    render(<PreviewPanelBody active={active} loading html="" />);
    expect(screen.getByRole("status", { name: "Cargando vista previa" })).toBeTruthy();
  });
});
