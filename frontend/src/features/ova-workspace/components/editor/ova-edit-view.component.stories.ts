import { Component } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";
import { applicationConfig } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { LLM_SETTINGS_MODAL } from "@/core/lib/llm-settings-modal.token";

import { OvaEditViewComponent } from "./ova-edit-view.component";

@Component({ selector: "gn-storybook-noop-llm-modal", template: "" })
class NoopLlmSettingsModalComponent {
  onOpenChange = { subscribe: () => ({ unsubscribe: () => undefined }) };
}

const sampleOva = {
  title: "Introducción a la Física de Newton",
  status: "listo",
  current_version: {
    id: "version-1",
    version_number: 3,
    phases: [
      {
        id: "phase-1",
        phase_type: "engage",
        title: "Video introductorio",
        content: `<!doctype html><html><body style="font-family: sans-serif; padding: 1.5rem;"><h1>¿Sabías que...?</h1></body></html>`,
      },
      {
        id: "phase-2",
        phase_type: "explore",
        title: "Simulador interactivo",
        content: `<!doctype html><html><body style="font-family: sans-serif; padding: 1.5rem;"><h1>Explora</h1></body></html>`,
      },
    ],
  },
  version_history: [
    { id: "version-1", version_number: 3, is_active: true, created_at: "2026-06-30T10:00:00Z" },
    { id: "version-0", version_number: 2, is_active: false, created_at: "2026-06-20T10:00:00Z" },
  ],
};

const meta: Meta<OvaEditViewComponent> = {
  component: OvaEditViewComponent,
  title: "Features/OvaWorkspace/Editor/OvaEditView",
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
        http.get("*/api/ovas/:ovaId/editar", () => HttpResponse.json(sampleOva)),
        http.get("*/api/uploads/temp", () => HttpResponse.json({ items: [] })),
        http.get("*/api/ovas/:ovaId/fases/:phaseId/versiones", () =>
          HttpResponse.json({ micro_versions: [] }),
        ),
      ],
    },
  },
  args: {
    ovaId: "ova-123",
  },
  render: (args) => ({
    props: args,
    template: `<div style="height: 600px;"><gn-ova-edit-view [ovaId]="ovaId" /></div>`,
  }),
};
export default meta;

type Story = StoryObj<OvaEditViewComponent>;

export const Default: Story = {};

export const Generating: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ovas/:ovaId/editar", () =>
          HttpResponse.json({ message: "OVA en generación" }, { status: 409 }),
        ),
        http.get("*/api/uploads/temp", () => HttpResponse.json({ items: [] })),
      ],
    },
  },
};
