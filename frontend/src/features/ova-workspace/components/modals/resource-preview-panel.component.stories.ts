import type { Meta, StoryObj } from "@storybook/angular";

import type { Resource } from "@/core/lib/ova-types";

import { ResourcePreviewPanelComponent } from "./resource-preview-panel.component";

const ENGAGE_COMIC: Resource = {
  id: 1,
  tipo: "Cómic Interactivo",
  emoji: "🎯",
  interactividad: "Alta",
};

const meta: Meta<ResourcePreviewPanelComponent> = {
  component: ResourcePreviewPanelComponent,
  title: "Features/OvaWorkspace/Modals/ResourcePreviewPanel",
  tags: ["autodocs"],
  args: {
    resource: ENGAGE_COMIC,
    phaseKey: "engage",
    phaseColor: "#EF4444",
  },
};
export default meta;

type Story = StoryObj<ResourcePreviewPanelComponent>;

export const WithPreview: Story = {};

export const NoResourceSelected: Story = {
  args: {
    resource: null,
  },
};

export const NoPreviewAvailable: Story = {
  args: {
    resource: { id: 99, tipo: "Recurso desconocido", emoji: "📦", interactividad: "Media" },
    phaseKey: "engage",
  },
};
