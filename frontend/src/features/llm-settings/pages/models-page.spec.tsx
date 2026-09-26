import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LlmSettingsStore } from "../hooks/llm-settings-store.types";
import type { Draft } from "../lib/llm-config-draft";
import { ModelsPage } from "./models-page";

const store: LlmSettingsStore = {
  settings: {},
  catalog: {},
  catalogFull: [],
  catalogAll: [],
  catalogEnabled: [],
  fullTotal: 4,
  fullHasMore: false,
  categories: [],
  types: [],
  enabledModels: [{ provider: "groq", model_id: "x" }],
  defaults: {},
  platform: null,
  bounds: [30, 300],
  hasOwnLlmKey: false,
  loading: false,
  loadingMore: false,
  saving: false,
  dirty: false,
  error: "",
  refetch: vi.fn(),
  catalogStatus: { groq: { ok: true }, openrouter: { ok: false } },
  ownCatalogStatus: null,
  refreshingCatalog: false,
  searchQuery: "",
  categoryFilter: "all",
  typeFilter: "all",
  sortKey: "default",
  groupBy: "provider",
  handleSearch: vi.fn(),
  handleCategory: vi.fn(),
  handleType: vi.fn(),
  handleSort: vi.fn(),
  handleGroup: vi.fn(),
  loadMore: vi.fn(),
  isDefaultModel: () => false,
  isModelEnabled: () => false,
  toggleFavorite: vi.fn(),
  setModel: vi.fn(),
  setTipoTimeout: vi.fn(),
  resetTipo: vi.fn(),
  setFallback: vi.fn(),
  addFallback: vi.fn(),
  removeFallback: vi.fn(),
  save: vi.fn(() => Promise.resolve(true)),
  discard: vi.fn(),
  retryRefresh: vi.fn(),
};

const admin = {
  loading: false,
  error: false,
  retry: vi.fn(),
  tasks: ["texto", "codigo"],
  models: [],
  draft: { texto: { default: { provider: "groq", model_id: "llama" }, fallbacks: [] } } as Draft,
  adminDirty: false,
  saving: false,
  setDraft: vi.fn(),
  discard: vi.fn(),
  save: vi.fn(),
};

vi.mock("@/core/auth/auth-store", () => ({
  useCurrentUser: () => ({ role: "administrador", permissions: [] }),
  useIsAdmin: () => true,
}));

const platformConfig: { data?: unknown } = {};

vi.mock("@/core/hooks/use-platform-config", () => ({
  usePlatformConfig: () => platformConfig,
}));

vi.mock("../hooks/use-llm-settings-store", () => ({
  useLlmSettingsStore: () => store,
}));

vi.mock("../hooks/use-admin-llm-draft", () => ({
  useAdminLlmDraft: () => admin,
}));

vi.mock("../components/models-master-detail", () => ({
  ModelsMasterDetail: () => createElement("div", { "data-testid": "master-detail" }),
}));

vi.mock("../hooks/use-config-apply", () => ({
  useConfigApply: () => ({ refresh: vi.fn(), undo: vi.fn(), announce: vi.fn() }),
}));

vi.mock("../components/models-config-tools", () => import("./models-page-config-tools-stub"));

vi.mock("../components/manage-models-modal", () => ({
  ManageModelsModal: () => null,
}));

vi.mock("../components/user-api-keys-card", () => import("./models-page-user-keys-stub"));

vi.mock("@/core/components/platform-api-keys-card", () => import("./models-page-platform-keys-stub"));

vi.mock("../components/platform-nodes-card", () => import("./models-page-nodes-stub"));

vi.mock("../components/platform-capabilities-card", () =>
  import("./models-page-capabilities-stub"),
);

const dismissPendingChangesToast = vi.fn();

vi.mock("../lib/pending-changes-toast", () => ({
  dismissPendingChangesToast: () => {
    dismissPendingChangesToast();
  },
}));

vi.mock("../components/guardrails-card", () => ({
  GuardrailsCard: () => null,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ModelsPage />
    </MemoryRouter>,
  );
}

describe("ModelsPage", () => {
  beforeEach(() => {
    store.dirty = false;
    store.enabledModels = [{ provider: "groq", model_id: "x" }];
    admin.loading = false;
    admin.adminDirty = false;
    admin.draft = { texto: { default: { provider: "groq", model_id: "llama" }, fallbacks: [] } };
    admin.tasks = ["texto", "codigo"];
  });

  it("renders clean header, status strip and three sections for admin", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Modelos de IA" })).toBeTruthy();
    expect(screen.queryByText("Configuración")).toBeNull();
    expect(screen.queryByText("Guardar plataforma")).toBeNull();
    expect(screen.queryByText("Proveedores conectados")).toBeNull();
    expect(screen.queryByText("Modelos favoritos")).toBeNull();
    expect(screen.queryByText("Cambios sin guardar")).toBeNull();
    expect(screen.getByText(/1 de 2 proveedores conectados · 1 modelo favorito/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Modelos$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Credenciales$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Plataforma/i })).toBeTruthy();
    expect(screen.getByTestId("master-detail")).toBeTruthy();
    // Perfiles e historial, en la cabecera: solo para el admin.
    expect(screen.getByTestId("config-tools")).toBeTruthy();
  });

  it("only counts providers when there are no favorites", () => {
    store.enabledModels = [];
    renderPage();
    expect(screen.getByText("1 de 2 proveedores conectados")).toBeTruthy();
  });

  it("cuenta los mismos proveedores que Credenciales cuando hay claves de plataforma", () => {
    store.enabledModels = [];
    platformConfig.data = {
      providers: ["groq", "openrouter", "opencode", "runware"],
      platform_config: { groq: "gsk_…1234", openrouter: "sk-or-…5678" },
      server_keys: [],
    };
    renderPage();
    expect(screen.getByText("2 de 4 proveedores conectados")).toBeTruthy();
    platformConfig.data = undefined;
  });

  it("shows sticky save bar only when dirty", () => {
    const { rerender } = renderPage();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(screen.queryByText(/Tienes cambios sin guardar/i)).toBeNull();

    store.dirty = true;
    rerender(
      <MemoryRouter>
        <ModelsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    expect(screen.getByText(/Tienes cambios sin guardar/i)).toBeTruthy();

    store.dirty = false;
    rerender(
      <MemoryRouter>
        <ModelsPage />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });

  it("al guardar o descartar cierra el aviso de «Guarda los cambios»", async () => {
    const user = userEvent.setup();
    dismissPendingChangesToast.mockClear();
    store.dirty = true;
    renderPage();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(dismissPendingChangesToast).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(dismissPendingChangesToast).toHaveBeenCalledTimes(2);
  });

  it("disables save while the chain has empty or duplicate models", () => {
    store.dirty = true;
    admin.tasks = ["texto"];
    admin.draft = {
      texto: {
        default: { provider: "groq", model_id: "llama" },
        fallbacks: [{ provider: "", model_id: "" }],
      },
    };
    renderPage();
    expect(
      screen.getByText("Para guardar, elige un modelo o quita los respaldos vacíos en Texto."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("shows credential subsections for admin", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /^Credenciales$/i }));
    // Para el admin, las de la plataforma van primero; las personales, después.
    expect(screen.getByText("Tus claves personales")).toBeTruthy();
    const platform = screen.getByTestId("platform-keys");
    const personal = screen.getByTestId("user-keys");
    expect(platform.compareDocumentPosition(personal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("mounts platform nodes card on Plataforma tab (not a metrics chart)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /Plataforma/i }));
    expect(screen.getByTestId("platform-nodes")).toBeTruthy();
    expect(screen.getByTestId("platform-capabilities")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /sparkline|métricas|chart/i })).toBeNull();
  });
});
