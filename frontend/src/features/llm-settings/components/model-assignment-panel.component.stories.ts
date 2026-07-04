import { applicationConfig, type Meta, type StoryObj } from "@storybook/angular";

import { CATEGORY_LABELS, TASK_LABELS, TYPE_LABELS } from "../lib/llm-settings-labels";
import type { ChipModel } from "../lib/model-task-card.helpers";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { ModelAssignmentPanelComponent } from "./model-assignment-panel.component";

const adminModels: ChipModel[] = [
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

function makeStore(overrides: Partial<UserLlmSettingsStore> = {}): Partial<UserLlmSettingsStore> {
  return {
    settings: {
      texto: { provider: "groq", model_id: "llama-3.3-70b-versatile", timeout_s: 120 },
      codigo: { provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet", timeout_s: 180 },
    },
    catalog: {},
    catalogEnabled: adminModels,
    catalogStatus: null,
    bounds: [30, 300],
    saving: false,
    loading: false,
    hasOwnLlmKey: true,
    taskLabels: TASK_LABELS,
    categoryLabels: CATEGORY_LABELS,
    typeLabels: TYPE_LABELS,
    setModel: () => {},
    setTipoTimeout: () => {},
    setFallback: () => {},
    resetTipo: () => {},
    save: () => Promise.resolve(true),
    retryRefresh: () => Promise.resolve(),
    ...overrides,
  };
}

const meta: Meta<ModelAssignmentPanelComponent> = {
  component: ModelAssignmentPanelComponent,
  title: "Features/LlmSettings/ModelAssignmentPanel",
  tags: ["autodocs"],
  args: {
    tasks: ["texto", "codigo", "imagen"],
    draft: {
      texto: { default: { provider: "groq", model_id: "llama-3.3-70b-versatile" }, fallbacks: [] },
      codigo: {
        default: { provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet" },
        fallbacks: [],
      },
    },
    adminModels,
    isAdmin: false,
    adminSaving: false,
  },
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore() }],
    }),
  ],
};
export default meta;

type Story = StoryObj<ModelAssignmentPanelComponent>;

export const UserView: Story = {};

export const AdminView: Story = {
  args: { isAdmin: true },
};

export const NoOwnKey: Story = {
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore({ hasOwnLlmKey: false }) }],
    }),
  ],
};
