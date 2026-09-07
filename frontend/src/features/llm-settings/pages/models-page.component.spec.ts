import { Component, input, output, signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular/zoneless";

import { AuthService } from "@/core/auth/auth.service";
import { PlatformApiKeysCardComponent } from "@/core/components/platform-api-keys-card.component";
import { PlatformSettingsService } from "@/core/services/platform-settings.service";

import { ManageModelsModalComponent } from "../components/manage-models-modal.component";
import { ModelsMasterDetailComponent } from "../components/models-master-detail.component";
import { PlatformCapabilitiesCardComponent } from "../components/platform-capabilities-card.component";
import { PlatformNodesCardComponent } from "../components/platform-nodes-card.component";
import { UserApiKeysCardComponent } from "../components/user-api-keys-card.component";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { ModelsPageComponent } from "./models-page.component";

@Component({
  selector: "gn-models-master-detail",
  template: `<div data-testid="master-detail"></div>`,
})
class StubMasterDetail {
  readonly tasks = input<string[]>([]);
  readonly draft = input<unknown>(null);
  readonly adminModels = input<unknown[]>([]);
  readonly isAdmin = input(false);
  readonly adminSaving = input(false);
  readonly draftChange = output();
  readonly openCatalog = output();
}

@Component({ selector: "gn-manage-models-modal", template: "" })
class StubManageModal {
  readonly open = input(false);
  readonly onClose = output();
  readonly onGoToApiKeys = output();
}

@Component({
  selector: "gn-user-api-keys-card",
  template: `<div data-testid="user-keys"></div>`,
})
class StubUserKeys {
  readonly compact = input(false);
}

@Component({
  selector: "gn-platform-api-keys-card",
  template: `<div data-testid="platform-keys"></div>`,
})
class StubPlatformKeys {
  readonly adminZone = input(false);
  readonly userOwned = input(false);
}

@Component({
  selector: "gn-platform-nodes-card",
  template: `<div data-testid="platform-nodes">Nodos del orquestador</div>`,
})
class StubNodes {}

@Component({
  selector: "gn-platform-capabilities-card",
  template: `<div data-testid="platform-capabilities"></div>`,
})
class StubCaps {}

function makeDirtyStore(dirtySig: ReturnType<typeof signal<boolean>>) {
  return {
    dirty: dirtySig,
    catalogStatus: signal({ groq: { ok: true }, openrouter: { ok: false } }),
    enabledModels: signal([{ provider: "groq", model_id: "x" }]),
    fullTotal: signal(4),
    catalogFull: signal([]),
    defaults: signal({}),
    saving: signal(false),
    loading: signal(false),
    load: vi.fn(() => Promise.resolve()),
    save: vi.fn(() => Promise.resolve(true)),
  };
}

const adminProviders = (store: ReturnType<typeof makeDirtyStore>) => [
  provideRouter([]),
  {
    provide: AuthService,
    useValue: {
      revalidate: () => Promise.resolve({ role: "administrador", permissions: [] }),
      user: () => ({ role: "administrador", permissions: [] }),
    },
  },
  {
    provide: PlatformSettingsService,
    useValue: {
      getAdminLlmConfig: () =>
        Promise.resolve({
          tasks: ["texto", "codigo"],
          catalog: [],
          config: { defaults: {}, fallbacks: {} },
        }),
      saveAdminLlmConfig: vi.fn(),
    },
  },
  { provide: UserLlmSettingsStore, useValue: store },
];

const importOverrides = [
  { replace: ModelsMasterDetailComponent, with: StubMasterDetail },
  { replace: ManageModelsModalComponent, with: StubManageModal },
  { replace: UserApiKeysCardComponent, with: StubUserKeys },
  { replace: PlatformApiKeysCardComponent, with: StubPlatformKeys },
  { replace: PlatformNodesCardComponent, with: StubNodes },
  { replace: PlatformCapabilitiesCardComponent, with: StubCaps },
];

async function renderAdminPage(dirty = false) {
  const dirtySig = signal(dirty);
  const store = makeDirtyStore(dirtySig);
  const result = await render(ModelsPageComponent, {
    providers: adminProviders(store),
    importOverrides,
  });
  await result.fixture.whenStable();
  result.fixture.detectChanges();
  await waitFor(() => {
    expect(screen.getByRole("tab", { name: /Plataforma/i })).toBeTruthy();
  });
  return { ...result, dirtySig, store };
}

describe("ModelsPageComponent", () => {
  it("renders clean header, status strip and three sections for admin", async () => {
    await renderAdminPage();

    expect(screen.getByRole("heading", { name: "Modelos de IA" })).toBeTruthy();
    expect(screen.queryByText("Configuración")).toBeNull();
    expect(screen.queryByText("Guardar plataforma")).toBeNull();
    expect(screen.getByText("Proveedores conectados")).toBeTruthy();
    expect(screen.getByText("Modelos favoritos")).toBeTruthy();
    expect(screen.getByText("Cambios sin guardar")).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Modelos$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Credenciales$/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Plataforma/i })).toBeTruthy();
    expect(screen.getByTestId("master-detail")).toBeTruthy();
  });

  it("shows sticky save bar only when dirty", async () => {
    const { fixture, dirtySig } = await renderAdminPage(false);

    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(screen.queryByText(/cambios sin guardar en la asignación/i)).toBeNull();

    dirtySig.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    expect(screen.getByText(/cambios sin guardar en la asignación/i)).toBeTruthy();

    dirtySig.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });

  it("shows credential subsections for admin", async () => {
    const { fixture } = await renderAdminPage();

    screen.getByRole("tab", { name: /^Credenciales$/i }).click();
    fixture.detectChanges();
    await fixture.whenStable();

    await waitFor(() => {
      expect(screen.getByText("Tus claves")).toBeTruthy();
      expect(screen.getByText("Claves de la plataforma")).toBeTruthy();
      expect(screen.getByTestId("user-keys")).toBeTruthy();
      expect(screen.getByTestId("platform-keys")).toBeTruthy();
    });
  });

  it("mounts platform nodes card on Plataforma tab (not a metrics chart)", async () => {
    const { fixture } = await renderAdminPage();

    screen.getByRole("tab", { name: /Plataforma/i }).click();
    fixture.detectChanges();
    await fixture.whenStable();

    await waitFor(() => {
      expect(screen.getByTestId("platform-nodes")).toBeTruthy();
      expect(screen.getByTestId("platform-capabilities")).toBeTruthy();
      expect(document.querySelector("gn-platform-nodes-card")).toBeTruthy();
      expect(screen.queryByRole("img", { name: /sparkline|métricas|chart/i })).toBeNull();
    });
  });
});
