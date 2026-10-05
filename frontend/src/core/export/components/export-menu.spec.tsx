import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EXPORT_FORMATS } from "../lib/formats";
import { ExportMenu } from "./export-menu";

describe("ExportMenu", () => {
  it("muestra los 6 formatos con su descripción", async () => {
    render(
      <ExportMenu selected="scorm12" onSelect={vi.fn()}>
        <button type="button">Abrir</button>
      </ExportMenu>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    const items = await screen.findAllByRole("menuitem");
    expect(items).toHaveLength(6);
    for (const f of EXPORT_FORMATS) {
      expect(screen.getByText(f.label)).toBeInTheDocument();
      expect(screen.getByText(f.description)).toBeInTheDocument();
    }
  });

  it.each(EXPORT_FORMATS.map((f) => [f.id, f.label] as const))("elegir %s llama con ese id", async (id, label) => {
    const onSelect = vi.fn();
    render(
      <ExportMenu selected="scorm12" onSelect={onSelect}>
        <button type="button">Abrir</button>
      </ExportMenu>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }));
    expect(onSelect).toHaveBeenCalledWith(id);
  });
});
