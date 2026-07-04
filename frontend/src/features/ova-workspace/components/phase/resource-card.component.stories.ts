import type { Meta, StoryObj } from "@storybook/angular";

import type { Resource } from "@/core/lib/ova-types";

import { ResourceCardComponent } from "./resource-card.component";

const sampleResource: Resource = {
  id: 1,
  tipo: "Video introductorio",
  emoji: "🎬",
  interactividad: "Alta",
};

const meta: Meta<ResourceCardComponent> = {
  component: ResourceCardComponent,
  title: "Features/OvaWorkspace/Phase/ResourceCard",
  tags: ["autodocs"],
  args: {
    resource: sampleResource,
    selected: false,
    phaseKey: "engage",
    phaseColor: "#EF4444",
    selectionIndex: null,
    disabled: false,
    showVideoHint: false,
    hasConfig: false,
  },
};
export default meta;

type Story = StoryObj<ResourceCardComponent>;

export const Default: Story = {};

export const Selected: Story = {
  args: { selected: true, selectionIndex: 1 },
};

export const WithConfig: Story = {
  args: { hasConfig: true },
};

export const VideoHint: Story = {
  args: {
    resource: { id: 2, tipo: "Video explicativo", emoji: "🎥", interactividad: "Media" },
    showVideoHint: true,
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const LowInteractivity: Story = {
  args: {
    resource: { id: 3, tipo: "Lectura guiada", emoji: "📖", interactividad: "Baja" },
  },
};
