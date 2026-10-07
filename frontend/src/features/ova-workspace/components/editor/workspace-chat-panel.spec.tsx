import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspaceChatPanel } from "./workspace-chat-panel";

vi.mock("../../hooks/use-uploads", () => ({
  useOvaUploads: () => ({
    data: [],
    uploading: false,
    indexing: false,
    uploadError: "",
    refresh: vi.fn(),
    removeUpload: vi.fn(),
    addFiles: vi.fn(),
  }),
}));

function makePhases(count: number): PhaseWithContent[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${String(index)}`,
    phase_type: "engage",
    title: `Recurso ${String(index + 1)}`,
    content: "<p>x</p>",
  }));
}

function makeRegen() {
  const mutate = vi.fn();
  const cancel = vi.fn();
  const regen = {
    ovaId: "ova-1",
    busy: false,
    composerError: undefined,
    request: { mutate },
    chat: { data: [], remove: { mutate: vi.fn() }, clear: { mutate: vi.fn() } },
    cancel: { canCancel: true, cancelling: false, run: cancel },
  } as unknown as ChatRegeneration;
  return { regen, mutate, cancel };
}

function type(text: string) {
  fireEvent.change(screen.getByLabelText("Describe los cambios que deseas"), { target: { value: text } });
}

describe("WorkspaceChatPanel · alcance de la instrucción", () => {
  it("mantiene la selección al cerrar el desplegable y la envía", () => {
    const { regen, mutate } = makeRegen();
    render(<WorkspaceChatPanel phases={makePhases(3)} regen={regen} />);
    fireEvent.click(screen.getByRole("button", { name: /Aplicar a: todo el OVA/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Recurso 2" }));
    // Cierra el desplegable: la etiqueta sigue diciendo 1 recurso.
    fireEvent.click(screen.getByRole("button", { name: /Aplicar a: 1 recurso/ }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    type("Más ejemplos");
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));
    expect(mutate.mock.calls[0][0]).toMatchObject({ prompt: "Más ejemplos", phaseIds: ["p1"] });
  });

  it("«Quitar selección» vuelve a todo el OVA", () => {
    const { regen, mutate } = makeRegen();
    render(<WorkspaceChatPanel phases={makePhases(3)} regen={regen} />);
    fireEvent.click(screen.getByRole("button", { name: /Aplicar a: todo el OVA/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Recurso 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar selección" }));
    expect(screen.getByRole("button", { name: /Aplicar a: todo el OVA/ })).toBeVisible();
    type("Más ejemplos");
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));
    expect(mutate.mock.calls[0][0]).toMatchObject({ phaseIds: [] });
  });

  it("pide confirmación antes de aplicar a todo un OVA grande", () => {
    const { regen, mutate } = makeRegen();
    render(<WorkspaceChatPanel phases={makePhases(8)} regen={regen} />);
    type("Cambia el tono");
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));
    expect(mutate).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/8 recursos/)).toBeVisible();
    fireEvent.click(within(dialog).getByRole("button", { name: "Aplicar a todo el OVA" }));
    expect(mutate.mock.calls[0][0]).toMatchObject({ prompt: "Cambia el tono", phaseIds: [] });
  });

  it("no pide confirmación en un OVA pequeño", () => {
    const { regen, mutate } = makeRegen();
    render(<WorkspaceChatPanel phases={makePhases(3)} regen={regen} />);
    type("Cambia el tono");
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambios" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
