import { Component, input, output } from "@angular/core";
import { render } from "@testing-library/angular/zoneless";

import { IconComponent } from "@/core/components/icon.component";
import type { Resource } from "@/features/ova-workspace/lib/ova-types";

import { PhaseSelectService } from "../../services/phase-select.service";
import { PhaseSelectModalComponent } from "./phase-select-modal.component";
import { ResourceConfigModalComponent } from "./resource-config-modal.component";

const ENGAGE_RESOURCES: Resource[] = [
  { id: "1", tipo: "Cómic Interactivo" },
  { id: "2", tipo: "Storyboard de Video" },
];

@Component({ selector: "gn-icon", template: "" })
class StubIcon {
  readonly name = input("");
  readonly size = input("");
}

@Component({ selector: "gn-resource-config-modal", template: "" })
class StubConfigModal {
  readonly resource = input<Resource | null>(null);
  readonly phaseKey = input("");
  readonly phaseColor = input("");
  readonly config = input<Record<string, number>>({});
  readonly videoKeyConfigured = input(true);
  readonly onClose = output();
  readonly onSave = output<unknown>();
}

function serviceStub() {
  return {
    fetchPhaseResources: vi.fn((key: string) =>
      Promise.resolve(key === "engage" ? ENGAGE_RESOURCES : []),
    ),
    fetchVideoKeyConfigured: vi.fn(() => Promise.resolve(true)),
  };
}

async function renderModal() {
  const result = await render(PhaseSelectModalComponent, {
    providers: [{ provide: PhaseSelectService, useValue: serviceStub() }],
    importOverrides: [
      { replace: IconComponent, with: StubIcon },
      { replace: ResourceConfigModalComponent, with: StubConfigModal },
    ],
  });
  await result.fixture.whenStable();
  result.fixture.detectChanges();
  return result;
}

describe("PhaseSelectModalComponent — 3a previewResource default", () => {
  it("CA-3 falls back to the first resource of the active phase when nothing is hovered or picked", async () => {
    const { fixture } = await renderModal();
    const cmp = fixture.componentInstance;

    expect(cmp.previewResource()).toEqual(ENGAGE_RESOURCES[0]);
  });

  it("CA-4 prefers the hovered resource over the default fallback", async () => {
    const { fixture } = await renderModal();
    const cmp = fixture.componentInstance;

    cmp.setHovered(ENGAGE_RESOURCES[1]);
    fixture.detectChanges();

    expect(cmp.previewResource()).toEqual(ENGAGE_RESOURCES[1]);
  });

  it("CA-5 prefers the last pick over the default fallback once hover clears", async () => {
    const { fixture } = await renderModal();
    const cmp = fixture.componentInstance;

    cmp.toggleResource(ENGAGE_RESOURCES[1]);
    cmp.setHovered(null);
    fixture.detectChanges();

    expect(cmp.previewResource()).toEqual(ENGAGE_RESOURCES[1]);
  });
});
