import { Component } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";
import { applicationConfig } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { LLM_SETTINGS_MODAL } from "@/core/lib/llm-settings-modal.token";

import type { PhaseWithContent } from "../../lib/types";
import { WorkspaceOvaPanelComponent } from "./workspace-ova-panel.component";

@Component({ selector: "gn-storybook-noop-llm-modal", template: "" })
class NoopLlmSettingsModalComponent {
  onOpenChange = { subscribe: () => ({ unsubscribe: () => undefined }) };
}

const samplePhases: PhaseWithContent[] = [
  {
    id: "phase-1",
    phase_type: "engage",
    title: "Video introductorio",
    content: `<!doctype html><html><body style="font-family: sans-serif; padding: 1.5rem;"><h1>¿Sabías que...?</h1><p>Contenido de enganche.</p></body></html>`,
  },
  {
    id: "phase-2",
    phase_type: "explore",
    title: "Simulador interactivo",
    content: `<!doctype html><html><body style="font-family: sans-serif; padding: 1.5rem;"><h1>Explora</h1></body></html>`,
  },
];

const meta: Meta<WorkspaceOvaPanelComponent> = {
  component: WorkspaceOvaPanelComponent,
  title: "Features/OvaWorkspace/Editor/WorkspaceOvaPanel",
  tags: ["autodocs"],
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: LLM_SETTINGS_MODAL,
          useValue: () => Promise.resolve(NoopLlmSettingsModalComponent),
        },
      ],
    }),
  ],
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ovas/:ovaId/fases/:phaseId/versiones", () =>
          HttpResponse.json({ micro_versions: [] }),
        ),
      ],
    },
  },
  args: {
    phases: samplePhases,
    versionNumber: 3,
    isReady: true,
    isLoading: false,
    ovaId: "ova-123",
  },
};
export default meta;

type Story = StoryObj<WorkspaceOvaPanelComponent>;

export const Default: Story = {};

export const Loading: Story = {
  args: { isLoading: true },
};

export const Empty: Story = {
  args: { phases: [], isReady: false },
};

export const NotReady: Story = {
  args: { isReady: false, versionNumber: 1 },
};
