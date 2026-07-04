import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import type { Meta, StoryObj } from "@storybook/angular";
import { applicationConfig } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { LLM_SETTINGS_MODAL } from "@/core/lib/llm-settings-modal.token";

import { OvaWorkspacePageComponent } from "./ova-workspace-page.component";

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
    ],
  },
  version_history: [],
};

function activatedRouteWithId(id: string) {
  return {
    snapshot: {
      paramMap: { get: (key: string) => (key === "id" ? id : null) },
      queryParamMap: { get: () => null },
    },
  };
}

const meta: Meta<OvaWorkspacePageComponent> = {
  component: OvaWorkspacePageComponent,
  title: "Features/OvaWorkspace/Pages/OvaWorkspacePage",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<OvaWorkspacePageComponent>;

/**
 * Renders with the global router's empty route (no `id` route param), so the
 * page shows the OVA creation flow (`gn-ova-creation-view`). The component
 * reads `route.snapshot.paramMap` directly via `ActivatedRoute`, which isn't
 * easily overridden from story args without a per-story route provider.
 */
export const Default: Story = {};

/** Overrides `ActivatedRoute` so the page resolves an existing OVA id and renders the editor view instead. */
export const EditingExistingOva: Story = {
  decorators: [
    applicationConfig({
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteWithId("ova-123") },
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
};
