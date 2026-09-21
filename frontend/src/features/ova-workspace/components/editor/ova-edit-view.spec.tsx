import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../../api/ova-workspace.api";
import { OvaEditView } from "./ova-edit-view";

vi.mock("./workspace-panel-toolbar", () => ({ WorkspacePanelToolbar: () => null }));
vi.mock("../viewer/ova-five-e-viewer", () => ({ default: () => null }));
vi.mock("../../api/ova-workspace.api", async (original) => ({
  ...(await original<typeof api>()),
  fetchOvaWorkspace: vi.fn(() =>
    Promise.resolve({
      title: "OVA de prueba",
      status: "listo",
      current_version: {
        version_number: 2,
        phases: [
          { id: "a", phase_type: "engage", title: "Primer recurso", content: "<p>Original</p>" },
          { id: "b", phase_type: "engage", title: "Segundo recurso", content: "<p>Segundo</p>" },
        ],
      },
    }),
  ),
  saveOvaPhase: vi.fn(() => Promise.resolve({ id: "a" })),
  deleteOvaPhase: vi.fn(() => Promise.resolve()),
  addOvaPhase: vi.fn(() => Promise.resolve({ id: "c" })),
  reorderOvaPhases: vi.fn(() => Promise.resolve()),
  triggerOvaRegeneration: vi.fn(() => Promise.resolve({ job_id: "regen-1" })),
  fetchRegenerationProgress: vi.fn(() => Promise.resolve({ status: "success", percentage: 100 })),
}));
vi.mock("../../api/workspace-chat.api", () => ({
  fetchWorkspaceChat: () => Promise.resolve({ messages: [] }),
  createWorkspaceChatMessage: () => Promise.resolve({}),
  updateWorkspaceChatMessage: () => Promise.resolve({}),
  deleteWorkspaceChatMessage: vi.fn(),
  clearWorkspaceChat: vi.fn(),
}));
vi.mock("../../api/uploads.api", () => ({
  fetchTemporaryFiles: () => Promise.resolve({ items: [] }),
  uploadTemporaryFiles: vi.fn(),
  removeTemporaryFile: vi.fn(),
}));

async function setup() {
  // Precalienta el import diferido del modal: en frío tarda >1 s y el timeout
  // por defecto de findBy* se queda corto.
  await import("../modals/add-resource-modal");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OvaEditView ovaId="ova-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText("OVA de prueba");
  fireEvent.click(screen.getByRole("tab", { name: "Editar" }));
  await screen.findAllByRole("button", { name: "Guardar cambios" });
}
describe("OvaEditView event wiring", () => {
  beforeEach(() => vi.clearAllMocks());
  it("renders header, version and accessible attachment action", async () => {
    await setup();
    expect(screen.getByRole("link", { name: /Mis OVAs/ })).toHaveAttribute("href", "/mis-ovas");
    expect(screen.getByText("v2")).toBeVisible();
    expect(screen.getByRole("button", { name: "Adjuntar archivo de apoyo" })).toBeVisible();
  });
  it("saves edited phase content", async () => {
    await setup();
    fireEvent.change(screen.getAllByLabelText("Contenido de fase")[0], { target: { value: "<p>Editado</p>" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Guardar cambios" })[0]);
    await waitFor(() => {
      expect(api.saveOvaPhase).toHaveBeenCalledWith("ova-1", "a", "<p>Editado</p>");
    });
  });
  it("deletes only after confirmation", async () => {
    await setup();
    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar recurso" })[0]);
    expect(api.deleteOvaPhase).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminación" }));
    await waitFor(() => {
      expect(api.deleteOvaPhase).toHaveBeenCalledWith("ova-1", "a");
    });
  });
  it("sends the reordered global indices", async () => {
    await setup();
    fireEvent.click(screen.getAllByRole("button", { name: "Subir Segundo recurso" })[0]);
    await waitFor(() => {
      expect(api.reorderOvaPhases).toHaveBeenCalledWith("ova-1", [
        { phase_id: "b", new_order: 0 },
        { phase_id: "a", new_order: 1 },
      ]);
    });
  });
  it("regenerates only the requested phase", async () => {
    await setup();
    fireEvent.click(screen.getAllByRole("button", { name: "Regenerar recurso" })[0]);
    // La etiqueta del botón no viaja como prompt: el backend la aplicaría como
    // un cambio sobre el HTML actual en vez de regenerar el recurso.
    await waitFor(() => {
      expect(api.triggerOvaRegeneration).toHaveBeenCalledWith("ova-1", { phaseIds: ["a"], prompt: "" });
    });
  });
  it("adds a resource from its phase section", async () => {
    await setup();
    fireEvent.click(screen.getAllByRole("button", { name: "Añadir recurso a Enganche" })[0]);
    fireEvent.change(await screen.findByLabelText("Instrucciones"), { target: { value: "Una lectura" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Añadir recurso" }).at(-1)!);
    await waitFor(() => {
      expect(api.addOvaPhase).toHaveBeenCalledWith("ova-1", "engage", "Una lectura");
    });
  });
});
