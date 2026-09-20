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
  catalogEnabled: [],
  fullTotal: 4,
  fullHasMore: false,
  categories: [],
  types: [],
  enabledModels: [{ provider: "groq", model_id: "x" }],
  defaults: {},
  bounds: [30, 300],
  hasOwnLlmKey: false,
  loading: false,
  loadingMore: false,
  saving: false,
  dirty: false,
  error: "",
  refetch: vi.fn(),
  catalogStatus: { groq: { ok: true }, openrouter: { ok: false } },
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

vi.mock("../hooks/use-llm-settings-store", () => ({
  useLlmSettingsStore: () => store,
}));

vi.mock("../hooks/use-admin-llm-draft", () => ({
  useAdminLlmDraft: () => admin,
}));

vi.mock("../components/models-master-detail", () => ({
  ModelsMasterDetail: () => createElement("div", { "data-testid": "master-detail" }),
}));

vi.mock("../components/manage-models-modal", () => ({
  ManageModelsModal: () => null,
}));

vi.mock("../components/user-api-keys-card", () => import("./models-page-user-keys-stub"));

vi.mock("@/core/components/platform-api-keys-card", () => import("./models-page-platform-keys-stub"));

vi.mock("../components/platform-nodes-card", () => import("./models-page-nodes-stub"));

vi.mock("../components/platform-capabilities-card", () =>
  import("./models-page-capabilities-stub"),
);

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
    expect(screen.getByText(/1 \/ 2 proveedores · 1 favorito/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Modelos$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Credenciales$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Plataforma/i })).toBeTruthy();
    expect(screen.getByTestId("master-detail")).toBeTruthy();
  });

  it("says all models are available when the favorites list is empty", () => {
    store.enabledModels = [];
    renderPage();
    expect(screen.getByText(/Todos los modelos disponibles/)).toBeTruthy();
  });

  it("shows sticky save bar only when dirty", () => {
    const { rerender } = renderPage();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(screen.queryByText(/cambios sin guardar en la asignación/i)).toBeNull();

    store.dirty = true;
    rerender(
      <MemoryRouter>
        <ModelsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    expect(screen.getByText(/cambios sin guardar en la asignación/i)).toBeTruthy();

    store.dirty = false;
    rerender(
      <MemoryRouter>
        <ModelsPage />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
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
    expect(screen.getByText(/duplicados o vacíos/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("shows credential subsections for admin", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: /^Credenciales$/i }));
    expect(screen.getByText("Tus claves")).toBeTruthy();
    expect(screen.getByText("Claves de la plataforma")).toBeTruthy();
    expect(screen.getByTestId("user-keys")).toBeTruthy();
    expect(screen.getByTestId("platform-keys")).toBeTruthy();
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
