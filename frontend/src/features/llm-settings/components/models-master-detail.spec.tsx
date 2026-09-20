import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type { LlmSettingsStore } from "../hooks/llm-settings-store.types";
import { LlmSettingsContext } from "../hooks/use-llm-settings";
import { ModelsMasterDetail } from "./models-master-detail";

vi.mock("./catalog-status-alert", () => ({
  CatalogStatusAlert: () => null,
}));

vi.mock("./llm-task-row", () => ({
  LlmTaskRow: ({ task }: { task: string }) =>
    createElement("div", { "data-testid": "task-row" }, task),
}));

vi.mock("./model-task-card-chips", () => ({
  ModelTaskCardChips: () => null,
}));

vi.mock("./user-override-section", () => ({
  UserOverrideSection: () => null,
}));

const draft = {
  texto: {
    default: { provider: "groq", model_id: "llama" },
    fallbacks: [{ provider: "openrouter", model_id: "gpt" }],
  },
  codigo: { default: { provider: "groq", model_id: "code" }, fallbacks: [] },
  imagen: {
    default: { provider: "runware", model_id: "runware:100@1" },
    fallbacks: [],
    generationEnabled: true,
  },
  video: {
    default: { provider: "", model_id: "" },
    fallbacks: [],
    generationEnabled: false,
  },
};

function stubStore(): LlmSettingsStore {
  return {
    settings: {},
    catalog: {},
    catalogFull: [],
    catalogEnabled: [],
    fullTotal: 0,
    fullHasMore: false,
    categories: [],
    types: [],
    enabledModels: [],
    defaults: {},
    bounds: [30, 300],
    hasOwnLlmKey: false,
    loading: false,
    loadingMore: false,
    saving: false,
    dirty: false,
    error: "",
    refetch: vi.fn(),
    catalogStatus: null,
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
}

function renderDetail(
  props: Partial<Parameters<typeof ModelsMasterDetail>[0]> & { isAdmin?: boolean } = {},
) {
  return render(
    <LlmSettingsContext.Provider value={stubStore()}>
      <ModelsMasterDetail
        tasks={props.tasks ?? ["texto", "codigo", "imagen"]}
        draft={props.draft ?? draft}
        adminModels={
          props.adminModels ?? [
            { provider: "groq", model_id: "llama", label: "Llama" },
            { provider: "groq", model_id: "code", label: "Code" },
          ]
        }
        isAdmin={props.isAdmin ?? true}
        adminSaving={false}
        chainIssues={{}}
        onDraftChange={vi.fn()}
        onOpenCatalog={props.onOpenCatalog ?? vi.fn()}
      />
    </LlmSettingsContext.Provider>,
  );
}

describe("ModelsMasterDetail", () => {
  it("renders task list and opens catalog", async () => {
    const openCatalog = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onOpenCatalog: openCatalog });

    expect(screen.getByRole("tab", { name: /Texto/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Código/i })).toBeTruthy();
    const textoTab = screen.getByRole("tab", { name: /Texto/i });
    expect(textoTab.getAttribute("aria-controls")).toBe("task-panel-texto");
    expect(textoTab.id).toBe("task-tab-texto");
    const panel = document.getElementById("task-panel-texto");
    expect(panel?.getAttribute("role")).toBe("tabpanel");
    expect(panel?.getAttribute("aria-labelledby")).toBe("task-tab-texto");
    await user.click(screen.getByRole("button", { name: /Abrir catálogo/i }));
    expect(openCatalog).toHaveBeenCalledOnce();
  });

  it("shows primary+fallbacks pattern for imagen (no media-task-card)", async () => {
    const user = userEvent.setup();
    renderDetail({
      tasks: ["texto", "imagen"],
      adminModels: [
        { provider: "runware", model_id: "runware:100@1", label: "FLUX", aptitudes: ["imagen"] },
      ],
    });
    await user.click(screen.getByRole("tab", { name: /Imagen/i }));
    expect(screen.queryByTestId("media-card")).toBeNull();
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(screen.getByTestId("task-row")).toBeTruthy();
    expect(screen.queryByText(/Pulsa «Editar cadena»/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Editar cadena/i })).toBeNull();
  });

  it("video switch off by default shows prompts-only message", async () => {
    const user = userEvent.setup();
    renderDetail({ tasks: ["video"], adminModels: [] });
    await user.click(screen.getByRole("tab", { name: /Video/i }));
    expect(screen.getByTestId("media-gen-off").textContent).toMatch(/prompts/i);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("shows llm-task-row immediately for admin without an edit toggle", () => {
    renderDetail({
      tasks: ["texto"],
      adminModels: [{ provider: "groq", model_id: "llama", label: "Llama" }],
    });
    expect(screen.getByTestId("task-row").textContent).toContain("texto");
    expect(screen.queryByRole("button", { name: /Editar cadena/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Listo$/i })).toBeNull();
    expect(screen.queryByText(/Pulsa «Editar cadena»/i)).toBeNull();
  });
});
