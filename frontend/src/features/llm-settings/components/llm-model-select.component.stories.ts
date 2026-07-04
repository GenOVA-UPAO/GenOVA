import type { Meta, StoryObj } from "@storybook/angular";

import { LlmModelSelectComponent } from "./llm-model-select.component";

const sampleModels = [
  {
    provider: "groq",
    model_id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    context_length: 128_000,
  },
  {
    provider: "openrouter",
    model_id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    context_length: 200_000,
    pricing: "$3 por 1M tokens",
  },
  { provider: "openrouter", model_id: "openai/gpt-4o", label: "GPT-4o", context_length: 128_000 },
];

const meta: Meta<LlmModelSelectComponent> = {
  component: LlmModelSelectComponent,
  title: "Features/LlmSettings/LlmModelSelect",
  tags: ["autodocs"],
  args: {
    models: sampleModels,
    provider: "groq",
    modelId: "llama-3.3-70b-versatile",
    disabled: false,
    ariaLabel: "Modelo principal",
  },
};
export default meta;

type Story = StoryObj<LlmModelSelectComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { provider: undefined, modelId: undefined },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const NoModels: Story = {
  args: { models: [], provider: undefined, modelId: undefined },
};
