import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";

import { EXPORT_FORMATS } from "../lib/formats";
import { ExportMenu } from "./export-menu";

describe("ExportMenu", () => {
  it("actualiza las descripciones de todos los formatos y conserva la selección H5P", async () => {
    const onSelect = vi.fn();
    render(<ExportMenu selected="h5p" onSelect={onSelect}><button type="button">Abrir</button></ExportMenu>);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(screen.getByText("Actividades editables para Moodle, WordPress o Lumi")).toBeVisible();
    await act(() => i18n.changeLanguage("en"));
    for (const format of EXPORT_FORMATS) {
      expect(screen.getByText(format.description)).toBeVisible();
    }
    expect(screen.getByText("Editable activities for Moodle, WordPress, or Lumi")).toBeVisible();
    await userEvent.click(screen.getByRole("menuitem", { name: /H5P/ }));
    expect(onSelect).toHaveBeenCalledWith("h5p");
  });
  it("muestra los 7 formatos con su descripción", async () => {
    render(
      <ExportMenu selected="scorm12" onSelect={vi.fn()}>
        <button type="button">Abrir</button>
      </ExportMenu>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    const items = await screen.findAllByRole("menuitem");
    expect(items).toHaveLength(7);
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
