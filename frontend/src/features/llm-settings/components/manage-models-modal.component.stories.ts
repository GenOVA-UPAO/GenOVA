import { applicationConfig, type Meta, type StoryObj } from "@storybook/angular";

import { CATEGORY_LABELS, TASK_LABELS, TYPE_LABELS } from "../lib/llm-settings-labels";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { ManageModelsModalComponent } from "./manage-models-modal.component";

const catalogFull: CatalogModel[] = [
  { provider: "groq", model_id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { provider: "groq", model_id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
  {
    provider: "openrouter",
    model_id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    pricing: "$3 por 1M tokens",
  },
  { provider: "openrouter", model_id: "openai/gpt-4o", label: "GPT-4o", pricing: "Variable" },
];

function makeStore(overrides: Partial<UserLlmSettingsStore> = {}): Partial<UserLlmSettingsStore> {
  return {
    hasOwnLlmKey: true,
    catalogFull,
    fullTotal: catalogFull.length,
    fullHasMore: false,
    loading: false,
    loadingMore: false,
    categories: ["all", "groq", "openrouter"],
    categoryFilter: "all",
    categoryLabels: CATEGORY_LABELS,
    taskLabels: TASK_LABELS,
    typeLabels: TYPE_LABELS,
    isDefaultModel: () => false,
    isModelEnabled: (provider, modelId) =>
      provider === "groq" && modelId === "llama-3.3-70b-versatile",
    toggleFavorite: () => Promise.resolve(),
    handleSearch: () => {},
    handleCategory: () => {},
    loadMore: () => {},
    ...overrides,
  };
}

const meta: Meta<ManageModelsModalComponent> = {
  component: ManageModelsModalComponent,
  title: "Features/LlmSettings/ManageModelsModal",
  tags: ["autodocs"],
  args: {
    open: true,
  },
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore() }],
    }),
  ],
};
export default meta;

type Story = StoryObj<ManageModelsModalComponent>;

export const Default: Story = {};

export const NoApiKeys: Story = {
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore({ hasOwnLlmKey: false }) }],
    }),
  ],
};

export const Loading: Story = {
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: UserLlmSettingsStore,
          useValue: makeStore({ loading: true, catalogFull: [] }),
        },
      ],
    }),
  ],
};

export const WithMoreToLoad: Story = {
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: UserLlmSettingsStore,
          useValue: makeStore({ fullHasMore: true, fullTotal: 120 }),
        },
      ],
    }),
  ],
};

export const Closed: Story = {
  args: { open: false },
};
