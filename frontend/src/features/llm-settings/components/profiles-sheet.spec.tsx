import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ModelProfile } from "../api/model-tools.api";
import { ProfilesSheet } from "./profiles-sheet";

const api = vi.hoisted(() => ({
  getModelProfiles: vi.fn(),
  createModelProfile: vi.fn(),
  renameModelProfile: vi.fn(),
  deleteModelProfile: vi.fn(),
  applyModelProfile: vi.fn(),
  restoreConfigVersion: vi.fn(),
}));

vi.mock("../api/model-tools.api", () => api);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CHANGE = {
  task: "texto",
  field: "primary" as const,
  before: "Claude Haiku 4.5",
  after: "DeepSeek V4.1 Flash",
  text: "Texto: Claude Haiku 4.5 → DeepSeek V4.1 Flash",
};

const profile = (over: Partial<ModelProfile>): ModelProfile => ({
  id: "p1",
  name: "Económico",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  config: {},
  changes: [CHANGE],
  ...over,
});

function renderSheet(onDiscardDraft = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProfilesSheet open onOpenChange={vi.fn()} dirty onDiscardDraft={onDiscardDraft} />
    </QueryClientProvider>,
  );
  return { onDiscardDraft };
}

describe("ProfilesSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getModelProfiles.mockResolvedValue({
      profiles: [profile({}), profile({ id: "p2", name: "Calidad", changes: [] })],
      limit: 20,
    });
  });

  it("marca el perfil en uso y resume cuánto cambia el resto", async () => {
    renderSheet();
    expect(await screen.findByText("Económico")).toBeInTheDocument();
    expect(screen.getByText(/1 cambio respecto a la actual/)).toBeInTheDocument();
    expect(screen.getByText("En uso")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Aplicar" })).toHaveLength(1);
  });

  it("aplica un perfil tras confirmar lo que cambia y ofrece deshacer", async () => {
    api.applyModelProfile.mockResolvedValue({
      config: {},
      tasks: [],
      history_entry: {
        id: "h1",
        at: "",
        actor: null,
        source: "profile",
        detail: "Económico",
        changes: [CHANGE],
      },
    });
    const { onDiscardDraft } = renderSheet();
    await userEvent.click(await screen.findByRole("button", { name: "Aplicar" }));
    const dialog = await screen.findByRole("dialog", { name: "¿Aplicar «Económico»?" });
    expect(within(dialog).getByText("Claude Haiku 4.5")).toBeInTheDocument();
    expect(within(dialog).getByText(/Se descartarán tus cambios sin guardar/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Aplicar perfil" }));

    expect(api.applyModelProfile.mock.calls[0][0]).toBe("p1");
    expect(onDiscardDraft).toHaveBeenCalled();
    const [message, options] = vi.mocked(toast.success).mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(message).toBe("Perfil «Económico» aplicado.");
    expect(options.action.label).toBe("Deshacer");
    api.restoreConfigVersion.mockResolvedValue({ config: {}, tasks: [], history_entry: null });
    options.action.onClick();
    expect(api.restoreConfigVersion).toHaveBeenCalledWith("h1", "before");
  });

  it("guarda la configuración actual con nombre y avisa si falta", async () => {
    api.createModelProfile.mockResolvedValue({ profile: profile({ id: "p3", name: "Solo Groq" }) });
    renderSheet();
    await userEvent.click(
      await screen.findByRole("button", { name: "Guardar la configuración actual" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));
    expect(screen.getByText("Escribe un nombre para el perfil.")).toBeInTheDocument();
    expect(api.createModelProfile).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Nombre del perfil"), "Solo Groq");
    await userEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));
    expect(api.createModelProfile.mock.calls[0][0]).toBe("Solo Groq");
  });

  it("explica cómo empezar cuando no hay perfiles", async () => {
    api.getModelProfiles.mockResolvedValue({ profiles: [], limit: 20 });
    renderSheet();
    expect(await screen.findByText("Aún no hay perfiles")).toBeInTheDocument();
  });
});
