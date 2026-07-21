import { inputBinding } from "@angular/core";
import { render } from "@testing-library/angular/zoneless";

import { ALL_WIREFRAME_KINDS, type WireframeKind } from "../../lib/previews/preview-types";
import { ResourceWireframeComponent } from "./resource-wireframe.component";

function renderWireframe(wire: WireframeKind, phaseColor = "#EF4444") {
  return render(ResourceWireframeComponent, {
    bindings: [inputBinding("wire", () => wire), inputBinding("phaseColor", () => phaseColor)],
  });
}

describe("ResourceWireframeComponent", () => {
  it.each([...ALL_WIREFRAME_KINDS])(
    "renders a sketch for wire kind '%s' without throwing",
    async (kind) => {
      const { container } = await renderWireframe(kind);

      const root = container.querySelector('[style*="color"]');
      expect(root).toBeTruthy();
      expect((root as HTMLElement).style.color.length).toBeGreaterThan(0);
    },
  );

  it("paints the accent color from phaseColor on the sketch root", async () => {
    const { container } = await renderWireframe("storyboard", "#3B82F6");

    const root = container.querySelector<HTMLElement>('[style*="color"]')!;

    // El DOM normaliza todo color inline a `rgb(...)`, así que comparar contra el
    // hex crudo nunca puede pasar. Se normaliza el esperado por la misma vía.
    const expected = document.createElement("div");
    expected.style.color = "#3B82F6";
    expect(root.style.color).toBe(expected.style.color);
  });

  it("comic renders a single panel with nav chrome", async () => {
    const { container } = await renderWireframe("comic");
    expect(container.querySelector(".flex.h-full.w-full.flex-col")).toBeTruthy();
    expect(container.querySelectorAll(".h-1.w-1.rounded-full").length).toBe(3);
  });

  it("storyboard renders stacked frames and a prompt strip", async () => {
    const { container } = await renderWireframe("storyboard");
    expect(container.querySelector(".border-dashed.border-current\\/50")).toBeTruthy();
    expect(container.querySelectorAll(".w-10.shrink-0").length).toBe(3);
  });

  it("audio renders 8 waveform bars", async () => {
    const { container } = await renderWireframe("audio");
    expect(container.querySelectorAll(".w-1\\.5.rounded-full:not(.h-1\\.5)").length).toBe(8);
  });

  it("lab fills the canvas with flask svg and control thumbs", async () => {
    const { container } = await renderWireframe("lab");
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("svg circle").length).toBe(2);
    expect(
      container.querySelectorAll(".rounded-full.border-2.border-background.bg-current").length,
    ).toBe(2);
  });

  it("decisions renders scenario block and A/B actions", async () => {
    const { container } = await renderWireframe("decisions");
    expect(container.querySelector(".grid.grid-cols-2")).toBeTruthy();
    expect(container.querySelector(".bg-current")).toBeTruthy();
  });

  it("matching renders two columns", async () => {
    const { container } = await renderWireframe("matching");
    expect(container.querySelectorAll(".flex-1.flex-col").length).toBeGreaterThanOrEqual(2);
  });

  it("diploma renders ornamental certificate frame", async () => {
    const { container } = await renderWireframe("diploma");
    expect(container.querySelector(".border-2.border-current\\/50")).toBeTruthy();
  });

  it("crossword renders a 5x5 grid", async () => {
    const { container } = await renderWireframe("crossword");
    expect(container.querySelector(".grid-cols-5.grid-rows-5")).toBeTruthy();
    expect(container.querySelectorAll(".grid-cols-5.grid-rows-5 > div").length).toBe(25);
  });

  it("code renders editor lines and run affordance", async () => {
    const { container } = await renderWireframe("code");
    expect(container.querySelector(".font-mono")).toBeTruthy();
    expect(container.querySelector(".self-end.bg-current")).toBeTruthy();
  });

  it("quiz renders progress, timer cue and 3 choice rows", async () => {
    const { container } = await renderWireframe("quiz");
    expect(container.querySelectorAll(".h-3\\.5.w-3\\.5.shrink-0.rounded-full").length).toBe(3);
    expect(container.querySelector(".border-current\\/60")).toBeTruthy();
  });

  it("timeline renders 4 milestone dots", async () => {
    const { container } = await renderWireframe("timeline");
    expect(container.querySelectorAll(".rounded-full.border-2.border-background").length).toBe(4);
  });

  it("game renders a 6-cell board with score chip", async () => {
    const { container } = await renderWireframe("game");
    expect(container.querySelectorAll(".grid-cols-3 > div").length).toBe(6);
  });

  it("graph renders 4 nodes with connecting lines", async () => {
    const { container } = await renderWireframe("graph");
    expect(container.querySelectorAll(".rounded-full.border-2.border-background").length).toBe(4);
    expect(container.querySelectorAll("svg line").length).toBe(4);
  });

  it("falls back to the default dashed sketch for an unmapped kind", async () => {
    const { container } = await renderWireframe("unknown" as WireframeKind);
    expect(container.querySelector(".border-dashed")).toBeTruthy();
  });
});
