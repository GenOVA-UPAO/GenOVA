import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ALL_WIREFRAME_KINDS } from "../../lib/previews/preview-types";
import { ResourceWireframe } from "./resource-wireframe";

describe("ResourceWireframe", () => {
  it.each(ALL_WIREFRAME_KINDS)("renders the %s sketch with the phase accent", (kind) => {
    const { container } = render(<ResourceWireframe kind={kind} phaseColor="#3B82F6" />);
    expect(container.querySelector("[data-wire]")).toHaveStyle({ color: "#3B82F6" });
    expect(container.querySelector("[data-wire]")?.children.length).toBeGreaterThan(0);
  });
  it("comic is a single panel with three navigation dots", () => {
    const { container } = render(<ResourceWireframe kind="comic" />);
    expect(container.querySelectorAll(".h-1.w-1.rounded-full")).toHaveLength(3);
    expect(container.querySelector(".grid-cols-2")).toBeNull();
  });
  it("audio has eight waveform bars", () => {
    const { container } = render(<ResourceWireframe kind="audio" />);
    expect(container.querySelectorAll('[style*="height"]')).toHaveLength(8);
  });
  it("crossword has a 5×5 grid", () => {
    const { container } = render(<ResourceWireframe kind="crossword" />);
    expect(container.querySelectorAll(".grid-cols-5 > div")).toHaveLength(25);
  });
  it("graph includes four edges and four nodes", () => {
    const { container } = render(<ResourceWireframe kind="graph" />);
    expect(container.querySelectorAll("svg line")).toHaveLength(4);
    expect(container.querySelectorAll(".rounded-full.border-2")).toHaveLength(4);
  });
});
