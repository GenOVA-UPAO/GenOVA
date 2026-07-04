import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import type { Resource } from "@/core/lib/ova-types";

import type { PhaseResourceMap } from "../../lib/phase-select.config";
import { PhaseSelectModalComponent } from "./phase-select-modal.component";

const RESOURCES_BY_PHASE: Record<string, Resource[]> = {
  engage: [
    { id: 1, tipo: "Cómic Interactivo", emoji: "🎯", interactividad: "Alta" },
    { id: 2, tipo: "Storyboard de Video", emoji: "🎥", interactividad: "Media" },
  ],
  explore: [
    { id: 1, tipo: "Simulador Virtual Lab", emoji: "🔍", interactividad: "Alta" },
    { id: 2, tipo: "Agente Socrático", emoji: "💬", interactividad: "Alta" },
    { id: 4, tipo: "Video con pausas activas", emoji: "🎥", interactividad: "Media" },
  ],
  explain: [{ id: 1, tipo: "Video Teórico", emoji: "💡", interactividad: "Media" }],
  elaborate: [{ id: 1, tipo: "Estudio de Caso", emoji: "🔨", interactividad: "Alta" }],
  evaluate: [{ id: 1, tipo: "Quiz Interactivo", emoji: "✅", interactividad: "Alta" }],
};

const RESOURCES_HANDLER = http.get("/api/agents/:phaseKey/recursos", ({ params }) => {
  const phaseKey = String(params["phaseKey"]);
  return HttpResponse.json({ recursos: RESOURCES_BY_PHASE[phaseKey] ?? [] });
});

const VIDEO_KEY_CONFIGURED_HANDLER = http.get("/api/admin/nodes-config", () =>
  HttpResponse.json({ video_api_key_configured: true }),
);

const VIDEO_KEY_NOT_CONFIGURED_HANDLER = http.get("/api/admin/nodes-config", () =>
  HttpResponse.json({ video_api_key_configured: false }),
);

const PRESELECTED: PhaseResourceMap = {
  engage: [RESOURCES_BY_PHASE["engage"][0]],
  explore: [RESOURCES_BY_PHASE["explore"][0], RESOURCES_BY_PHASE["explore"][1]],
  explain: [],
  elaborate: [],
  evaluate: [],
};

const meta: Meta<PhaseSelectModalComponent> = {
  component: PhaseSelectModalComponent,
  title: "Features/OvaWorkspace/Modals/PhaseSelectModal",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [RESOURCES_HANDLER, VIDEO_KEY_CONFIGURED_HANDLER],
    },
  },
};
export default meta;

type Story = StoryObj<PhaseSelectModalComponent>;

/** Empty starting selection, resources load from the mocked agents endpoints. */
export const Default: Story = {};

/** Reopening the modal with resources already picked in a prior session. */
export const WithPreselection: Story = {
  args: {
    initialSelections: PRESELECTED,
  },
};

/** Video resource hint shown when no video API key is configured. */
export const VideoKeyMissing: Story = {
  parameters: {
    msw: {
      handlers: [RESOURCES_HANDLER, VIDEO_KEY_NOT_CONFIGURED_HANDLER],
    },
  },
};
