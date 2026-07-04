import type { Meta, StoryObj } from "@storybook/angular";

import type { CatalogModel } from "../lib/user-llm-settings.types";
import { ModelCatalogRowComponent } from "./model-catalog-row.component";

const sampleModel: CatalogModel = {
  provider: "openrouter",
  model_id: "anthropic/claude-3.5-sonnet",
  label: "Claude 3.5 Sonnet",
  curated: true,
  modality: "multimodal",
  category: "texto",
  context_length: 200_000,
};

const meta: Meta<ModelCatalogRowComponent> = {
  component: ModelCatalogRowComponent,
  title: "Features/LlmSettings/ModelCatalogRow",
  tags: ["autodocs"],
  args: {
    model: sampleModel,
    locked: false,
    enabled: false,
    saving: false,
    typeLabels: { texto: "Texto" },
  },
};
export default meta;

type Story = StoryObj<ModelCatalogRowComponent>;

export const Default: Story = {};

export const Enabled: Story = {
  args: { enabled: true },
};

export const Saving: Story = {
  args: { saving: true },
};

export const Locked: Story = {
  args: { locked: true, enabled: true },
};

export const NotCurated: Story = {
  args: {
    model: { ...sampleModel, curated: false, label: "Modelo experimental" },
  },
};
