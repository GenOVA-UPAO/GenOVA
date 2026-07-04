import type { Meta, StoryObj } from "@storybook/angular";

import type { CatalogModel } from "../lib/user-llm-settings.types";
import { ManageModelRowComponent } from "./manage-model-row.component";

const freeModel: CatalogModel = {
  provider: "groq",
  model_id: "llama-3.3-70b-versatile",
  label: "Llama 3.3 70B",
  description: "Modelo rápido de propósito general.",
};

const paidModel: CatalogModel = {
  provider: "openrouter",
  model_id: "anthropic/claude-3.5-sonnet",
  label: "Claude 3.5 Sonnet",
  pricing: "$3 por 1M tokens",
  description: "Modelo de razonamiento avanzado.",
};

const meta: Meta<ManageModelRowComponent> = {
  component: ManageModelRowComponent,
  title: "Features/LlmSettings/ManageModelRow",
  tags: ["autodocs"],
  args: {
    model: freeModel,
    locked: false,
    enabled: false,
  },
};
export default meta;

type Story = StoryObj<ManageModelRowComponent>;

export const Default: Story = {};

export const Enabled: Story = {
  args: { enabled: true },
};

export const Locked: Story = {
  args: { locked: true, enabled: true },
};

export const PaidModel: Story = {
  args: { model: paidModel, enabled: true },
};

export const VariablePricing: Story = {
  args: {
    model: { ...paidModel, pricing: "Variable" },
  },
};
