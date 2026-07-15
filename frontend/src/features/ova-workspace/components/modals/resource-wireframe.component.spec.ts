import { inputBinding } from "@angular/core";
import { render } from "@testing-library/angular/zoneless";

import type { WireframeKind } from "../../lib/previews/preview-types";
import { ResourceWireframeComponent } from "./resource-wireframe.component";

const ALL_KINDS: WireframeKind[] = [
  "comic",
  "video",
  "audio",
  "chat",
  "lab",
  "quiz",
  "read",
  "map",
  "game",
  "timeline",
  "form",
  "card",
];

function renderWireframe(wire: WireframeKind, phaseColor = "#EF4444") {
  return render(ResourceWireframeComponent, {
    bindings: [inputBinding("wire", () => wire), inputBinding("phaseColor", () => phaseColor)],
  });
}

describe("ResourceWireframeComponent", () => {
  it.each(ALL_KINDS)("renders a sketch for wire kind '%s' without throwing", async (kind) => {
    const { container } = await renderWireframe(kind);

    const root = container.querySelector('[style*="color"]');
    expect(root).toBeTruthy();
    expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
  });

  it("paints the accent color from phaseColor on the sketch root", async () => {
    const { container } = await renderWireframe("video", "#3B82F6");

    const root = container.querySelector<HTMLElement>('[style*="color"]')!;
    expect(root.style.color).toBe("#3B82F6");
  });

  it("comic renders a 4-panel grid", async () => {
    const { container } = await renderWireframe("comic");
    expect(container.querySelectorAll(".grid.grid-cols-2 > div").length).toBe(4);
  });

  it("audio renders 8 waveform bars", async () => {
    const { container } = await renderWireframe("audio");
    expect(container.querySelectorAll(".w-1\\.5.rounded-full:not(.h-1\\.5)").length).toBe(8);
  });

  it("quiz renders 3 radio+line rows", async () => {
    const { container } = await renderWireframe("quiz");
    expect(container.querySelectorAll(".h-3\\.5.w-3\\.5.shrink-0.rounded-full").length).toBe(3);
  });

  it("timeline renders 4 milestone dots", async () => {
    const { container } = await renderWireframe("timeline");
    expect(container.querySelectorAll(".rounded-full.border-2.border-background").length).toBe(4);
  });

  it("game renders a 6-cell grid", async () => {
    const { container } = await renderWireframe("game");
    expect(container.querySelectorAll(".grid-cols-3 > div").length).toBe(6);
  });

  it("map renders 4 pins with connecting lines", async () => {
    const { container } = await renderWireframe("map");
    expect(container.querySelectorAll(".rounded-full.border-2.border-background").length).toBe(4);
    expect(container.querySelectorAll("svg line").length).toBe(3);
  });

  it("falls back to the default dashed sketch for an unmapped kind", async () => {
    const { container } = await renderWireframe("unknown" as WireframeKind);
    expect(container.querySelector(".border-dashed")).toBeTruthy();
  });
});
