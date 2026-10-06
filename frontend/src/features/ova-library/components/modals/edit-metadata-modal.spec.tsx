import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";

import { EditMetadataModal } from "./edit-metadata-modal";

vi.mock("@/core/package-themes/use-package-themes", () => ({
  usePackageThemes: () => ({ data: { themes: [] }, isError: false }),
}));

describe("metadatos educativos del OVA", () => {
  it("traduce licencia, ayudas y errores ya visibles conservando los valores del API", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EditMetadataModal initial={{ title: "Curso", license: "Todos los derechos reservados", typical_learning_time: "incorrecto" }} onSave={onSave} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Usa PT30M");
    await act(() => i18n.changeLanguage("en"));
    expect(i18n.t("metadata:licenses.reservedLabel")).toBe("All rights reserved");
    expect(screen.getByRole("dialog", { name: "Edit OVA metadata" })).toBeVisible();
    expect(screen.getByLabelText("License")).toHaveValue("Todos los derechos reservados");
    expect(screen.getByRole("option", { name: "All rights reserved" })).toBeVisible();
    expect(screen.getByText("Reuse requires permission from the rights holder.")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Use PT30M");
    const duration = screen.getByLabelText("Typical learning time");
    await user.clear(duration);
    await user.type(duration, "PT30M");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ license: "Todos los derechos reservados", typical_learning_time: "PT30M" }));
  });
  it("carga los valores actuales y guarda licencia y datos educativos", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EditMetadataModal initial={{ title: "Células", description: "Biología", license: "CC BY 4.0", language: "es-PE", author: "Ana", keywords: ["célula"], educational_level: "Superior", audience: "Primer ciclo", typical_learning_time: "PT30M" }} onSave={onSave} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Autor")).toHaveValue("Ana");
    expect(screen.getByLabelText("Idioma")).toHaveValue("es-PE");
    expect(screen.getByLabelText("Nivel educativo")).toHaveValue("Superior");
    expect(screen.getByLabelText("Público destinatario")).toHaveValue("Primer ciclo");
    await user.selectOptions(screen.getByLabelText("Licencia"), "CC BY-NC-SA 4.0");
    expect(screen.getByText("Sin uso comercial; exige atribución y la misma licencia.")).toBeVisible();
    await user.clear(screen.getByLabelText("Palabras clave"));
    await user.type(screen.getByLabelText("Palabras clave"), "célula, biología");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ license: "CC BY-NC-SA 4.0", language: "es-PE", author: "Ana", keywords: ["célula", "biología"], typical_learning_time: "PT30M" }));
  });

  it("usa los valores por defecto para OVAs antiguos", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EditMetadataModal initial={{ title: "Curso" }} onSave={onSave} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Licencia")).toHaveValue("CC BY-SA 4.0");
    expect(screen.getByLabelText("Idioma")).toHaveValue("es");
    expect(screen.getByText(/Los cambios viajan al exportar en todos los formatos/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ license: "CC BY-SA 4.0", language: "es", keywords: [] }));
  });

  it("valida la duración, muestra la solución y enfoca el campo", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EditMetadataModal initial={{ title: "Curso" }} onSave={onSave} onCancel={vi.fn()} />);
    const duration = screen.getByLabelText("Tiempo típico de aprendizaje");
    await user.type(duration, "30 minutos");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(duration).toHaveFocus();
    expect(duration).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Usa PT30M");
    await user.clear(duration);
    await user.type(duration, "PT1H30M");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ typical_learning_time: "PT1H30M" }));
  });

  it("deshabilita el formulario mientras guarda", () => {
    render(<EditMetadataModal initial={{ title: "Curso" }} isLoading onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Licencia")).toBeDisabled();
    expect(screen.getByLabelText("Autor")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Guardando/ })).toBeDisabled();
  });

  it("avisa antes de cerrar con cambios sin guardar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<EditMetadataModal initial={{ title: "Curso" }} onSave={vi.fn()} onCancel={onCancel} />);
    await user.type(screen.getByLabelText("Autor"), "Ana");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
