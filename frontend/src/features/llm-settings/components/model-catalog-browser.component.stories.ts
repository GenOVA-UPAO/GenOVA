import { applicationConfig, type Meta, type StoryObj } from "@storybook/angular";

import { CATEGORY_LABELS, TASK_LABELS, TYPE_LABELS } from "../lib/llm-settings-labels";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { ModelCatalogBrowserComponent } from "./model-catalog-browser.component";

const catalogFull: CatalogModel[] = [
  {
    provider: "groq",
    model_id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    category: "texto",
  },
  {
    provider: "openrouter",
    model_id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    category: "razonamiento",
    context_length: 200_000,
  },
];

function makeStore(overrides: Partial<UserLlmSettingsStore> = {}): Partial<UserLlmSettingsStore> {
  return {
    catalogFull,
    fullTotal: catalogFull.length,
    fullHasMore: false,
    loading: false,
    loadingMore: false,
    searchQuery: "",
    categoryFilter: "all",
    typeFilter: "all",
    categories: ["all", "groq", "openrouter"],
    types: ["all", "texto", "razonamiento"],
    categoryLabels: CATEGORY_LABELS,
    taskLabels: TASK_LABELS,
    typeLabels: TYPE_LABELS,
    isDefaultModel: () => false,
    isModelEnabled: (provider, modelId) =>
      provider === "groq" && modelId === "llama-3.3-70b-versatile",
    toggleFavorite: () => Promise.resolve(),
    handleSearch: () => {},
    handleCategory: () => {},
    handleType: () => {},
    loadMore: () => {},
    ...overrides,
  };
}

const meta: Meta<ModelCatalogBrowserComponent> = {
  component: ModelCatalogBrowserComponent,
  title: "Features/LlmSettings/ModelCatalogBrowser",
  tags: ["autodocs"],
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore() }],
    }),
  ],
};
export default meta;

type Story = StoryObj<ModelCatalogBrowserComponent>;

export const Default: Story = {};

export const EmptyResults: Story = {
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: UserLlmSettingsStore,
          useValue: makeStore({ catalogFull: [], searchQuery: "gpt-9" }),
        },
      ],
    }),
  ],
};

export const Loading: Story = {
  decorators: [
    applicationConfig({
      providers: [
        { provide: UserLlmSettingsStore, useValue: makeStore({ loading: true, catalogFull: [] }) },
      ],
    }),
  ],
};
