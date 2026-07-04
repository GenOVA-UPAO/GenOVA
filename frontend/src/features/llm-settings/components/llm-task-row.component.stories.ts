import type { Meta, StoryObj } from "@storybook/angular";

import { LlmTaskRowComponent } from "./llm-task-row.component";

const sampleModels = [
  {
    provider: "groq",
    model_id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    modality: "text",
  },
  {
    provider: "openrouter",
    model_id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    modality: "multimodal",
  },
  { provider: "openrouter", model_id: "openai/gpt-4o", label: "GPT-4o", modality: "multimodal" },
];

const meta: Meta<LlmTaskRowComponent> = {
  component: LlmTaskRowComponent,
  title: "Features/LlmSettings/LlmTaskRow",
  tags: ["autodocs"],
  args: {
    task: "texto",
    value: {
      default: { provider: "groq", model_id: "llama-3.3-70b-versatile" },
      fallbacks: [{ provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet" }],
    },
    models: sampleModels,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<LlmTaskRowComponent>;

export const Default: Story = {};

export const NoFallbacks: Story = {
  args: {
    value: { default: { provider: "groq", model_id: "llama-3.3-70b-versatile" }, fallbacks: [] },
  },
};

export const MultipleFallbacks: Story = {
  args: {
    task: "codigo",
    value: {
      default: { provider: "openrouter", model_id: "openai/gpt-4o" },
      fallbacks: [
        { provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet" },
        { provider: "groq", model_id: "llama-3.3-70b-versatile" },
      ],
    },
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
