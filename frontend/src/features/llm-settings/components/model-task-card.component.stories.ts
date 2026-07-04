import type { Meta, StoryObj } from "@storybook/angular";

import type { ChipModel } from "../lib/model-task-card.helpers";
import { type AdminTaskDraft, ModelTaskCardComponent } from "./model-task-card.component";

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
];

const adminDraft: AdminTaskDraft = {
  default: { provider: "groq", model_id: "llama-3.3-70b-versatile" },
  fallbacks: [{ provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet" }],
};

const meta: Meta<ModelTaskCardComponent> = {
  component: ModelTaskCardComponent,
  title: "Features/LlmSettings/ModelTaskCard",
  tags: ["autodocs"],
  args: {
    task: "texto",
    index: 0,
    adminDraft,
    adminModels: sampleModels,
    isAdmin: true,
    adminDisabled: false,
    isEditing: false,
    hasOwnLlmKey: false,
    userDisabled: false,
    bounds: [30, 300],
  },
};
export default meta;

type Story = StoryObj<ModelTaskCardComponent>;

export const AdminView: Story = {};

export const NonAdminView: Story = {
  args: { isAdmin: false },
};

export const EditingChain: Story = {
  args: { isEditing: true },
};

export const CodigoTaskWithUserOverride: Story = {
  args: {
    task: "codigo",
    hasOwnLlmKey: true,
    isAdmin: false,
  },
};

export const NoFallbacks: Story = {
  args: {
    adminDraft: { default: { provider: "groq", model_id: "llama-3.3-70b-versatile" } },
  },
};
