import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResourcePreviewPanel } from "./resource-preview-panel";

describe("ResourcePreviewPanel", () => {
  it("distinguishes empty selection from unavailable metadata", () => {
    const { rerender } = render(<ResourcePreviewPanel phase="engage" />);
    expect(screen.getByText("Pasa el cursor o selecciona un recurso para ver qué genera")).toBeVisible();
    rerender(<ResourcePreviewPanel phase="engage" resource={{ id: "999" }} />);
    expect(screen.getByText("Vista previa no disponible para este recurso.")).toBeVisible();
  });
  it("renders the original deliverable description and comic sketch", () => {
    const { container } = render(<ResourcePreviewPanel phase="engage" resource={{ id: "1", tipo: "Cómic Interactivo" }} />);
    expect(screen.getByText("Página HTML con viñetas clicables y una pregunta final.")).toBeVisible();
    expect(container.querySelector('[data-wire="comic"]')).toBeTruthy();
  });
});
