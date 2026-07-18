import { inputBinding } from "@angular/core";
import { render, screen } from "@testing-library/angular/zoneless";

import type { Resource } from "@/features/ova-workspace/lib/ova-types";

import { ResourcePreviewPanelComponent } from "./resource-preview-panel.component";

const ENGAGE_COMIC: Resource = { id: "1", tipo: "Cómic Interactivo", interactividad: "Alta" };

describe("ResourcePreviewPanelComponent", () => {
  it("shows the empty-state hint when no resource is given (CA-1)", async () => {
    await render(ResourcePreviewPanelComponent, {
      bindings: [inputBinding("resource", () => null), inputBinding("phaseKey", () => "engage")],
    });

    expect(
      screen.getByText("Pasa el cursor o selecciona un recurso para ver qué genera"),
    ).toBeTruthy();
  });

  it("renders the mini-wireframe sketch and the 'returns' description for a known resource (CA-2)", async () => {
    const { container } = await render(ResourcePreviewPanelComponent, {
      bindings: [
        inputBinding("resource", () => ENGAGE_COMIC),
        inputBinding("phaseKey", () => "engage"),
        inputBinding("phaseColor", () => "#EF4444"),
      ],
    });

    expect(container.querySelector("gn-resource-wireframe")).toBeTruthy();
    expect(
      screen.getByText("Página HTML con viñetas clicables y una pregunta final."),
    ).toBeTruthy();
    // Comic wireframe: single panel + 3-dot carousel nav (not a 2×2 grid).
    expect(container.querySelectorAll(".h-1.w-1.rounded-full").length).toBe(3);
  });

  it("falls back to the unavailable-preview message for a resource with no preview info", async () => {
    await render(ResourcePreviewPanelComponent, {
      bindings: [
        inputBinding("resource", (): Resource => ({ id: "999", tipo: "X" })),
        inputBinding("phaseKey", () => "engage"),
      ],
    });

    expect(screen.getByText("Vista previa no disponible para este recurso.")).toBeTruthy();
  });
});
