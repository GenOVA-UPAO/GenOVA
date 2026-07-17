import { Component, input, output, signal } from "@angular/core";
import { render, screen } from "@testing-library/angular/zoneless";

import { ButtonComponent } from "@/core/components/ui/button.component";

import { CrearOvaTourService } from "../../services/crear-ova-tour.service";
import { OvaCreationFlowService } from "../../services/ova-creation-flow.service";
import { OvaJobService } from "../../services/ova-job.service";
import { OvaUploadsService } from "../../services/ova-uploads.service";
import { PhaseSelectModalComponent } from "../modals/phase-select-modal.component";
import { CrearOvaPreviewPanelComponent } from "./crear-ova-preview-panel.component";
import { OvaCreateFormCardComponent } from "./ova-create-form-card.component";
import { OvaCreationViewComponent } from "./ova-creation-view.component";
import { ProgressPanelComponent } from "./progress-panel.component";
import { TotalFailurePanelComponent } from "./total-failure-panel.component";

@Component({ selector: "gn-ova-create-form-card", template: "" })
class StubFormCard {
  readonly prompt = input("");
  readonly minChars = input(10);
  readonly canGenerate = input(false);
  readonly selections = input<Record<string, unknown>>({});
  readonly totalResources = input(0);
  readonly phasesWithResources = input(0);
  readonly theme = input<{ color: string; design: string }>({ color: "upao", design: "upao" });
  readonly error = input("");
  readonly uploadsProps = input<unknown>(null);
  readonly promptChange = output<string>();
  readonly openModal = output();
  readonly generate = output();
  readonly themeChange = output<unknown>();
  readonly replayTour = output();
  readonly closePicker = output();
}

@Component({ selector: "gn-phase-select-modal", template: "" })
class StubPhaseModal {
  readonly initialSelections = input<unknown>(null);
  readonly initialResourceConfigs = input<unknown>(null);
  readonly onClose = output();
  readonly onConfirm = output<unknown>();
}

@Component({ selector: "gn-progress-panel", template: "" })
class StubProgressPanel {
  readonly job = input<unknown>(null);
  readonly viewModel = input<unknown[]>([]);
  readonly selectedIds = input<string[]>([]);
  readonly activeId = input<string | null>(null);
  readonly showCancel = input(false);
  readonly isStalled = input(false);
  readonly onToggle = output<string>();
  readonly onRetryOne = output<string>();
  readonly onPreview = output<string>();
  readonly onSelectAll = output();
  readonly onRetrySelected = output();
  readonly onCancel = output();
  readonly onResume = output();
}

@Component({ selector: "gn-crear-ova-preview-panel", template: "" })
class StubPreviewPanel {
  readonly jobId = input<string | null>(null);
  readonly viewModel = input<unknown[]>([]);
  readonly pinnedId = input<string | null>(null);
  readonly onPin = output<string | null>();
}

@Component({ selector: "gn-total-failure-panel", template: "" })
class StubFailurePanel {
  readonly viewModel = input<unknown[]>([]);
  readonly onRetryAll = output();
}

function jobStub(phase: "idle" | "starting" | "polling" | "terminal") {
  return {
    phase: () => phase,
    viewModel: () => [],
    job: () => null,
    jobId: () => null as string | null,
    error: () => "",
    selectedFailedIds: () => [] as string[],
    outcome: () => ({ totalFail: false, anyDone: false, isTerminal: phase === "terminal" }),
    isStalled: () => false,
    toggleFailed: vi.fn(),
    retryOne: vi.fn(),
    selectAllFailed: vi.fn(),
    retrySelected: vi.fn(),
    retryAll: vi.fn(),
    cancel: vi.fn(),
  };
}

function flowStub() {
  return {
    prompt: signal(""),
    minChars: 10,
    canGenerate: signal(false),
    selections: signal({}),
    totalResources: signal(0),
    phasesWithResources: signal(0),
    theme: signal({ color: "upao", design: "upao" }),
    isModalOpen: signal(false),
    resourceConfigs: signal({}),
    setPrompt: vi.fn(),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    confirmSelections: vi.fn(),
    setTheme: vi.fn(),
    generate: vi.fn(),
    reset: vi.fn(),
    restore: vi.fn(),
  };
}

describe("OvaCreationViewComponent", () => {
  it("CA-21 shows usable starting status when generating with empty viewModel", async () => {
    await render(OvaCreationViewComponent, {
      providers: [
        { provide: OvaJobService, useValue: jobStub("starting") },
        { provide: OvaCreationFlowService, useValue: flowStub() },
        {
          provide: OvaUploadsService,
          useValue: {
            uploads: () => [],
            activeUploadsCount: () => 0,
            maxUploadFiles: 5,
            isUploadingFiles: () => false,
            uploadError: () => "",
            handleFilesSelected: vi.fn(),
            handleRemoveUpload: vi.fn(),
          },
        },
        {
          provide: CrearOvaTourService,
          useValue: { startIfNeeded: vi.fn(), restart: vi.fn(), destroy: vi.fn() },
        },
      ],
      importOverrides: [
        { replace: OvaCreateFormCardComponent, with: StubFormCard },
        { replace: PhaseSelectModalComponent, with: StubPhaseModal },
        { replace: ProgressPanelComponent, with: StubProgressPanel },
        { replace: CrearOvaPreviewPanelComponent, with: StubPreviewPanel },
        { replace: TotalFailurePanelComponent, with: StubFailurePanel },
        { replace: ButtonComponent, with: ButtonComponent },
      ],
    });

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Iniciando generación…")).toBeTruthy();
  });
});
