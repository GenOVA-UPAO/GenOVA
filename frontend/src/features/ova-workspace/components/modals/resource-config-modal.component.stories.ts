import type { Meta, StoryObj } from "@storybook/angular";

import type { Resource } from "@/core/lib/ova-types";

import { ResourceConfigModalComponent } from "./resource-config-modal.component";

const EXPLORE_SIMULATOR: Resource = {
  id: 1,
  tipo: "Simulador Virtual Lab",
  emoji: "🔍",
  interactividad: "Alta",
};

const meta: Meta<ResourceConfigModalComponent> = {
  component: ResourceConfigModalComponent,
  title: "Features/OvaWorkspace/Modals/ResourceConfigModal",
  tags: ["autodocs"],
  args: {
    resource: EXPLORE_SIMULATOR,
    phaseKey: "explore",
    phaseColor: "#3B82F6",
    config: {},
    videoKeyConfigured: true,
    visible: true,
  },
};
export default meta;

type Story = StoryObj<ResourceConfigModalComponent>;

export const Default: Story = {};

export const VideoResourceWithoutKey: Story = {
  args: {
    resource: { id: 4, tipo: "Storyboard de Video", emoji: "🎥", interactividad: "Media" },
    phaseKey: "explore",
    videoKeyConfigured: false,
  },
};

export const NoConfigurableOptions: Story = {
  args: {
    resource: { id: 999, tipo: "Recurso sin opciones", emoji: "📦", interactividad: "Baja" },
    phaseKey: "unknown-phase",
  },
};
