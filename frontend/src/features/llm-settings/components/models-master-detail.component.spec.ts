import { Component, input, inputBinding, output, outputBinding, signal } from "@angular/core";
import { render, screen } from "@testing-library/angular/zoneless";

import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { CatalogStatusAlertComponent } from "./catalog-status-alert.component";
import { LlmTaskRowComponent } from "./llm-task-row.component";
import { ModelTaskCardChipsComponent } from "./model-task-card-chips.component";
import { ModelsMasterDetailComponent } from "./models-master-detail.component";
import { UserOverrideSectionComponent } from "./user-override-section.component";

@Component({ selector: "gn-catalog-status-alert", template: "" })
class StubCatalogAlert {
  readonly catalogStatus = input<unknown>(null);
  readonly refreshing = input(false);
  readonly retry = output();
}

@Component({
  selector: "gn-llm-task-row",
  template: `<div data-testid="task-row">{{ task() }}</div>`,
})
class StubTaskRow {
  readonly task = input("");
  readonly value = input<unknown>(null);
  readonly models = input<unknown[]>([]);
  readonly disabled = input(false);
  readonly onChange = output();
}

@Component({ selector: "gn-model-task-card-chips", template: "" })
class StubChips {
  readonly fallbacks = input<unknown[]>([]);
  readonly models = input<unknown[]>([]);
  readonly chip = input("");
  readonly num = input("");
}

@Component({ selector: "gn-user-override-section", template: "" })
class StubOverride {
  readonly task = input("");
  readonly chip = input("");
  readonly num = input("");
  readonly userDisabled = input(false);
  readonly bounds = input<number[]>([]);
}

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

const overrides = [
  { replace: CatalogStatusAlertComponent, with: StubCatalogAlert },
  { replace: LlmTaskRowComponent, with: StubTaskRow },
  { replace: ModelTaskCardChipsComponent, with: StubChips },
  { replace: UserOverrideSectionComponent, with: StubOverride },
];

function stubStore(): Partial<UserLlmSettingsStore> {
  return {
    catalogStatus: signal(null),
    refreshingCatalog: signal(false),
    hasOwnLlmKey: signal(false),
    saving: signal(false),
    bounds: signal([30, 300]),
    defaults: signal({}),
    // Vacío = sin acotar; el pool por tarea cae al catálogo entero.
    enabledModels: signal([]),
    retryRefresh: () => Promise.resolve(),
  };
}

describe("ModelsMasterDetailComponent", () => {
  it("renders task list and opens catalog", async () => {
    const openCatalog = vi.fn();
    await render(ModelsMasterDetailComponent, {
      providers: [{ provide: UserLlmSettingsStore, useValue: stubStore() }],
      importOverrides: overrides,
      bindings: [
        inputBinding("tasks", () => ["texto", "codigo", "imagen"]),
        inputBinding("draft", () => draft),
        inputBinding("adminModels", () => [
          { provider: "groq", model_id: "llama", label: "Llama" },
          { provider: "groq", model_id: "code", label: "Code" },
        ]),
        inputBinding("isAdmin", () => true),
        outputBinding("openCatalog", openCatalog),
      ],
    });

    expect(screen.getByRole("tab", { name: /Texto/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Código/i })).toBeTruthy();
    const textoTab = screen.getByRole("tab", { name: /Texto/i });
    expect(textoTab.getAttribute("aria-controls")).toBe("task-panel-texto");
    expect(textoTab.id).toBe("task-tab-texto");
    const panel = document.getElementById("task-panel-texto");
    expect(panel?.getAttribute("role")).toBe("tabpanel");
    expect(panel?.getAttribute("aria-labelledby")).toBe("task-tab-texto");
    screen.getByRole("button", { name: /Abrir catálogo/i }).click();
    expect(openCatalog).toHaveBeenCalledOnce();
  });

  it("shows primary+fallbacks pattern for imagen (no media-task-card)", async () => {
    const { fixture } = await render(ModelsMasterDetailComponent, {
      providers: [{ provide: UserLlmSettingsStore, useValue: stubStore() }],
      importOverrides: overrides,
      bindings: [
        inputBinding("tasks", () => ["texto", "imagen"]),
        inputBinding("draft", () => draft),
        inputBinding("adminModels", () => [
          { provider: "runware", model_id: "runware:100@1", label: "FLUX", aptitudes: ["imagen"] },
        ]),
        inputBinding("isAdmin", () => true),
      ],
    });

    screen.getByRole("tab", { name: /Imagen/i }).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(screen.queryByTestId("media-card")).toBeNull();
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(screen.getByText(/Pulsa «Editar cadena»/i)).toBeTruthy();
  });

  it("video switch off by default shows prompts-only message", async () => {
    const { fixture } = await render(ModelsMasterDetailComponent, {
      providers: [{ provide: UserLlmSettingsStore, useValue: stubStore() }],
      importOverrides: overrides,
      bindings: [
        inputBinding("tasks", () => ["video"]),
        inputBinding("draft", () => draft),
        inputBinding("adminModels", () => []),
        inputBinding("isAdmin", () => true),
      ],
    });

    fixture.componentInstance.selectTask("video");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(screen.getByTestId("media-gen-off").textContent).toMatch(/prompts/i);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("reveals llm-task-row only after Editar cadena", async () => {
    const { fixture } = await render(ModelsMasterDetailComponent, {
      providers: [{ provide: UserLlmSettingsStore, useValue: stubStore() }],
      importOverrides: overrides,
      bindings: [
        inputBinding("tasks", () => ["texto"]),
        inputBinding("draft", () => draft),
        inputBinding("adminModels", () => [
          { provider: "groq", model_id: "llama", label: "Llama" },
        ]),
        inputBinding("isAdmin", () => true),
      ],
    });

    expect(screen.queryByTestId("task-row")).toBeNull();
    expect(screen.getByText(/Pulsa «Editar cadena»/i)).toBeTruthy();

    screen.getByRole("button", { name: /Editar cadena/i }).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(screen.getByTestId("task-row").textContent).toContain("texto");
    expect(screen.getByRole("button", { name: /^Listo$/i })).toBeTruthy();
  });
});
