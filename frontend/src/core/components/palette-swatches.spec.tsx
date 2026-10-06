import { act, render, screen } from "@testing-library/react";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";

import { knownPalette, PALETTES } from "@/core/lib/ova-palettes";

import { PaletteSwatches } from "./palette-swatches";

describe("paletas traducidas", () => {
  it("conserva la selección guardada en español al cambiar a inglés", async () => {
    const saved = { ...PALETTES[1] };
    render(<PaletteSwatches name="palette" selected={saved} onSelect={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Océano" })).toBeChecked();
    await act(() => i18n.changeLanguage("en"));
    expect(screen.getByRole("radio", { name: "Ocean" })).toBeChecked();
    expect(knownPalette(saved)?.p).toBe(saved.p);
    expect(screen.getAllByRole("radio")).toHaveLength(PALETTES.length);
  });
});
