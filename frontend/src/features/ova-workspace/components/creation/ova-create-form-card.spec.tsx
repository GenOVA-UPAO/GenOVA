import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { canCreate, EXAMPLE_PROMPT } from "../../lib/creation-form";
import type { EducationLevelId } from "../../lib/education-levels";
import { OvaCreateFormCard } from "./ova-create-form-card";

beforeAll(() => {
  // jsdom no implementa Pointer Events ni scrollIntoView; Radix Select los usa.
  for (const name of ["hasPointerCapture", "releasePointerCapture", "setPointerCapture"] as const) {
    Object.defineProperty(Element.prototype, name, { configurable: true, value: vi.fn() });
  }
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

function setup(overrides = {}) {
  const props = {
    prompt: "",
    onPrompt: vi.fn(),
    ready: false,
    phases: 0,
    total: 0,
    theme: { color: "upao", design: "upao" },
    nivel: "universitario-inicial" as EducationLevelId,
    onNivelChange: vi.fn(),
    files: [],
    onRemove: vi.fn(),
    onOpen: vi.fn(),
    onGenerate: vi.fn(),
    onTour: vi.fn(),
    ...overrides,
  };
  return { ...render(<OvaCreateFormCard {...props} />), props };
}
describe("OvaCreateFormCard", () => {
  it("shows required steps and accessible toolbar labels", () => {
    setup();
    expect(screen.getByLabelText("Pasos para crear un OVA")).toBeVisible();
    for (const text of ["1. Describe", "2. Elige recursos", "3. Genera"])
      expect(screen.getByText(text)).toBeVisible();
    for (const name of ["Configurar recursos 5E", "Archivos de referencia", "Tema visual"])
      expect(screen.getByRole("button", { name })).toBeVisible();
  });
  it("uses the university machine learning example", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Usar ejemplo de prompt" }));
    expect(props.onPrompt).toHaveBeenCalledWith(EXAMPLE_PROMPT);
    expect(EXAMPLE_PROMPT).toMatch(/Tema:.*machine learning/);
    expect(EXAMPLE_PROMPT).toMatch(/Objetivos:/);
    expect(EXAMPLE_PROMPT).toMatch(/Nivel educativo: Universitario/);
  });
  it("keeps generate disabled for short prompts and insufficient phases", () => {
    setup({ prompt: "corto", phases: 1 });
    expect(screen.getByText("Faltan 5 caracteres para generar")).toBeVisible();
    expect(screen.getByText("Selecciona recursos en al menos 2 fases (falta 1)")).toBeVisible();
    expect(screen.getByRole("button", { name: "Generar OVA" })).toBeDisabled();
    expect(canCreate("         ", 2, false)).toBe(false);
    expect(canCreate("Tema completo", 1, false)).toBe(false);
    expect(canCreate("Tema completo", 2, true)).toBe(false);
    expect(canCreate("Tema completo", 2, false)).toBe(true);
  });
  it("guards Ctrl+Enter and keeps a box-producing span as the tour anchor", () => {
    const { props, container, rerender } = setup();
    fireEvent.keyDown(screen.getByLabelText("Describe el tema del OVA"), {
      key: "Enter",
      ctrlKey: true,
    });
    expect(props.onGenerate).not.toHaveBeenCalled();
    rerender(<OvaCreateFormCard {...props} prompt="Un tema válido" phases={2} ready />);
    fireEvent.keyDown(screen.getByLabelText("Describe el tema del OVA"), {
      key: "Enter",
      ctrlKey: true,
    });
    expect(props.onGenerate).toHaveBeenCalledOnce();
    const anchor = container.querySelector("#tour-crear-ova-generar");
    expect(anchor?.tagName).toBe("SPAN");
    expect(anchor).toHaveClass("inline-flex");
  });
  it("wires tutorial, configuration buttons and accessible errors", () => {
    const { props } = setup({ error: "Error de generación" });
    const tutorial = screen.getByRole("button", { name: "Ver tutorial" });
    expect(tutorial.querySelector("svg")).not.toBeNull();
    fireEvent.click(tutorial);
    expect(props.onTour).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Configurar recursos 5E" }));
    expect(props.onOpen).toHaveBeenCalledWith("resources");
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByLabelText("Describe el tema del OVA")).toHaveClass(
      "focus-visible:ring-2",
      "focus-visible:ring-ring",
    );
  });
  it("shows the chosen level in the chip next to the theme chip and in the select", () => {
    setup({ nivel: "posgrado" });
    expect(screen.getByText("Nivel: Posgrado")).toBeVisible();
    expect(screen.getByLabelText("Nivel educativo")).toHaveTextContent("Posgrado");
    expect(screen.getByLabelText("Nivel educativo")).not.toHaveTextContent("Secundaria");
  });
  it("changes the level from the select and reflects it in the chip", async () => {
    const user = userEvent.setup();
    let nivel: EducationLevelId = "universitario-inicial";
    const onNivelChange = vi.fn((next: EducationLevelId) => {
      nivel = next;
    });
    const { props, rerender } = setup({ onNivelChange });
    await user.click(screen.getByLabelText("Nivel educativo"));
    await user.click(screen.getByRole("option", { name: "Secundaria" }));
    expect(props.onNivelChange).toHaveBeenCalledWith("secundaria");
    rerender(<OvaCreateFormCard {...props} nivel={nivel} />);
    expect(screen.getByText("Nivel: Secundaria")).toBeVisible();
    expect(screen.getByLabelText("Nivel educativo")).toHaveTextContent("Secundaria");
  });
});
