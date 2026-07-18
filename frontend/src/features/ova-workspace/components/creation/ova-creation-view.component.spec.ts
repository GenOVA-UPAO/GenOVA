import { Component, input, output, signal } from "@angular/core";
import { render } from "@testing-library/angular/zoneless";

import { CrearOvaTourService } from "../../services/crear-ova-tour.service";
import { OvaCreationFlowService } from "../../services/ova-creation-flow.service";
import { OvaJobService } from "../../services/ova-job.service";
import { OvaUploadsService } from "../../services/ova-uploads.service";
import { PhaseSelectModalComponent } from "../modals/phase-select-modal.component";
import { OvaCreateFormCardComponent } from "./ova-create-form-card.component";
import { OvaCreationViewComponent } from "./ova-creation-view.component";

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

function jobStub() {
  return {
    phase: () => "idle" as const,
    viewModel: () => [],
    job: () => null,
    jobId: () => null as string | null,
    error: () => "",
    selectedFailedIds: () => [] as string[],
    outcome: () => ({ totalFail: false, anyDone: false, isTerminal: false }),
    isStalled: () => false,
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
  it("al entrar en /crear resetea el flujo (progreso vive en workspace)", async () => {
    const flow = flowStub();
    await render(OvaCreationViewComponent, {
      providers: [
        { provide: OvaJobService, useValue: jobStub() },
        { provide: OvaCreationFlowService, useValue: flow },
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
      ],
    });

    expect(flow.reset).toHaveBeenCalled();
  });
});
