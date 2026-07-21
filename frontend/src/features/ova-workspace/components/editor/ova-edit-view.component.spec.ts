// Regresión del bug "outputs sin enlazar": los eventos del panel OVA
// (editar/regenerar/eliminar/añadir/reordenar) deben llegar al servicio.
import { Component, input, inputBinding, output, signal } from "@angular/core";
import { By } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { render } from "@testing-library/angular/zoneless";

import { IconComponent } from "@/core/components/icon.component";

import type { PhaseWithContent } from "../../lib/types";
import { OvaUploadsService } from "../../services/ova-uploads.service";
import { OvaWorkspaceService } from "../../services/ova-workspace.service";
import { VersionHistoryPanelComponent } from "../versioning/version-history-panel.component";
import { OvaEditViewComponent } from "./ova-edit-view.component";
import { WorkspaceChatPanelComponent } from "./workspace-chat-panel.component";
import { WorkspaceOvaPanelComponent } from "./workspace-ova-panel.component";
import { WorkspaceResizableDividerComponent } from "./workspace-resizable-divider.component";

@Component({ selector: "gn-icon", template: "" })
class StubIcon {
  readonly name = input("");
  readonly size = input("");
}

@Component({ selector: "gn-workspace-ova-panel", template: "" })
class StubOvaPanel {
  readonly phases = input<PhaseWithContent[]>([]);
  readonly versionNumber = input<number | null>(null);
  readonly isReady = input(false);
  readonly isLoading = input(false);
  readonly ovaId = input("");
  readonly onDownload = output();
  readonly onHistoryOpen = output();
  readonly onPhaseReverted = output();
  readonly onEditPhase = output<{ phaseId: string; content: string }>();
  readonly onRegenPhase = output<{ phaseId: string; prompt?: string }>();
  readonly onDeletePhase = output<string>();
  readonly onAddPhase = output<{ phaseType: string; prompt: string }>();
  readonly onReorder = output<PhaseWithContent[]>();
}

// El stub debe declarar TODA la superficie que la plantilla de OvaEditViewComponent
// enlaza: cualquier input ausente aborta el render con NG0303 y tumba el archivo
// entero, no solo la aserción que lo usa.
@Component({ selector: "gn-workspace-chat-panel", template: "" })
class StubChatPanel {
  readonly prompt = input("");
  readonly isRegenerating = input(false);
  readonly regenProgress = input<unknown>(null);
  readonly messages = input<unknown[]>([]);
  readonly uploads = input<unknown>(null);
  readonly phases = input<PhaseWithContent[]>([]);
  readonly selectionMode = input(false);
  readonly selectedPhaseIds = input<string[]>([]);
  readonly canSelectAll = input(false);
  readonly canRegenAll = input(false);
  readonly promptChange = output<string>();
  readonly onSubmit = output();
  readonly onFilesSelected = output<FileList>();
  readonly onRemoveFile = output<string>();
  readonly onRegenAll = output();
  readonly onToggleSelectionMode = output();
  readonly onTogglePhaseSelection = output<string>();
  readonly onSelectAll = output();
  readonly onDeleteMessage = output<string>();
  readonly onClearChat = output();
}

@Component({ selector: "gn-workspace-resizable-divider", template: "" })
class StubDivider {
  readonly ratio = input(0.5);
  readonly containerRef = input<HTMLElement | null>(null);
  readonly ratioChange = output<number>();
}

@Component({ selector: "gn-version-history-panel", template: "" })
class StubHistoryPanel {
  readonly open = input(false);
  readonly ovaId = input("");
  readonly versions = input<unknown[]>([]);
  readonly currentVersionId = input<string | undefined>(undefined);
  readonly openChange = output<boolean>();
  readonly onReverted = output();
}

function wsStub() {
  return {
    addPhase: vi.fn(() => Promise.resolve()),
    deletePhase: vi.fn(() => Promise.resolve()),
    downloadScorm: vi.fn(),
    error: signal(""),
    generating: signal(false),
    init: vi.fn(),
    isReady: signal(true),
    isRegenerating: signal(false),
    load: vi.fn(),
    loading: signal(false),
    ova: signal({ title: "OVA de prueba" }),
    phases: signal<PhaseWithContent[]>([]),
    prompt: signal(""),
    regenProgress: signal({ percentage: 0, stage: "" }),
    reorderPhases: vi.fn(() => Promise.resolve()),
    runRegen: vi.fn(() => Promise.resolve(true)),
    savePhase: vi.fn(() => Promise.resolve()),
    setPrompt: vi.fn(),
    submitPrompt: vi.fn(),
    submitRegenAll: vi.fn(),
    chatMessages: signal([]),
    logSelectionMode: vi.fn(),
    logSelectionToggle: vi.fn(),
    logSelectionAll: vi.fn(),
    teardown: vi.fn(),
    versionHistory: signal([]),
    versionNumber: signal(1),
  };
}

function uploadsStub() {
  return {
    activeUploadsCount: () => 0,
    handleFilesSelected: vi.fn(),
    handleRemoveUpload: vi.fn(),
    isUploadingFiles: () => false,
    maxUploadFiles: 5,
    uploadError: () => "",
    uploads: () => [],
  };
}

async function renderView(ws: ReturnType<typeof wsStub>) {
  const result = await render(OvaEditViewComponent, {
    bindings: [inputBinding("ovaId", () => "ova-1")],
    providers: [
      provideRouter([]),
      { provide: OvaWorkspaceService, useValue: ws },
      { provide: OvaUploadsService, useValue: uploadsStub() },
    ],
    importOverrides: [
      { replace: IconComponent, with: StubIcon },
      { replace: WorkspaceOvaPanelComponent, with: StubOvaPanel },
      { replace: WorkspaceChatPanelComponent, with: StubChatPanel },
      { replace: WorkspaceResizableDividerComponent, with: StubDivider },
      { replace: VersionHistoryPanelComponent, with: StubHistoryPanel },
    ],
  });
  await result.fixture.whenStable();
  result.fixture.detectChanges();
  const panel = result.fixture.debugElement.query(By.directive(StubOvaPanel))
    .componentInstance as StubOvaPanel;
  return { panel, ...result };
}

describe("OvaEditViewComponent — enlaces del panel OVA", () => {
  it("onEditPhase guarda el contenido de la fase vía el servicio", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);

    panel.onEditPhase.emit({ content: "<p>editado</p>", phaseId: "fase-1" });

    expect(ws.savePhase).toHaveBeenCalledWith("fase-1", "<p>editado</p>");
  });

  it("onRegenPhase dispara una regeneración acotada a esa fase", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);

    panel.onRegenPhase.emit({ phaseId: "fase-1", prompt: "más ejemplos" });

    expect(ws.runRegen).toHaveBeenCalledWith({ faseIds: ["fase-1"], prompt: "más ejemplos" });
  });

  it("onDeletePhase elimina la fase vía el servicio", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);

    panel.onDeletePhase.emit("fase-1");

    expect(ws.deletePhase).toHaveBeenCalledWith("fase-1");
  });

  it("onAddPhase añade un recurso con tipo y prompt", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);

    panel.onAddPhase.emit({ phaseType: "explore", prompt: "una lectura" });

    expect(ws.addPhase).toHaveBeenCalledWith("explore", "una lectura");
  });

  it("onReorder envía la lista reordenada al servicio", async () => {
    const ws = wsStub();
    const { panel } = await renderView(ws);
    const reordered = [
      { id: "b", phase_type: "engage" },
      { id: "a", phase_type: "engage" },
    ];

    panel.onReorder.emit(reordered);

    expect(ws.reorderPhases).toHaveBeenCalledWith(reordered);
  });
});
