import type { Meta, StoryObj } from "@storybook/angular";

import type { ChipModel } from "../lib/model-task-card.helpers";
import { ModelTaskCardChipsComponent } from "./model-task-card-chips.component";

const sampleModels: ChipModel[] = [
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

const meta: Meta<ModelTaskCardChipsComponent> = {
  component: ModelTaskCardChipsComponent,
  title: "Features/LlmSettings/ModelTaskCardChips",
  tags: ["autodocs"],
  args: {
    fallbacks: [
      { provider: "groq", model_id: "llama-3.3-70b-versatile" },
      { provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet" },
    ],
    models: sampleModels,
    chip: "bg-primary/8 text-primary border-primary/20",
    num: "text-primary font-black",
  },
};
export default meta;

type Story = StoryObj<ModelTaskCardChipsComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { fallbacks: [] },
};

export const Overflow: Story = {
  args: {
    fallbacks: [
      { provider: "groq", model_id: "llama-3.3-70b-versatile" },
      { provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet" },
      { provider: "openrouter", model_id: "openai/gpt-4o" },
      { provider: "groq", model_id: "llama-3.1-8b-instant" },
      { provider: "openrouter", model_id: "google/gemini-1.5-pro" },
      { provider: "openrouter", model_id: "meta-llama/llama-3-70b" },
    ],
  },
};
