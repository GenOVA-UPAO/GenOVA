import { applicationConfig, type Meta, type StoryObj } from "@storybook/angular";

import { CATEGORY_LABELS, TASK_LABELS, TYPE_LABELS } from "../lib/llm-settings-labels";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { LlmSettingsFormComponent } from "./llm-settings-form.component";

const catalog: Record<string, CatalogModel[]> = {
  groq: [
    {
      provider: "groq",
      model_id: "llama-3.3-70b-versatile",
      label: "Llama 3.3 70B",
      context_length: 128_000,
    },
  ],
  openrouter: [
    {
      provider: "openrouter",
      model_id: "anthropic/claude-3.5-sonnet",
      label: "Claude 3.5 Sonnet",
      pricing: "$3 por 1M tokens",
      context_length: 200_000,
    },
  ],
};

function makeStore(overrides: Partial<UserLlmSettingsStore> = {}): Partial<UserLlmSettingsStore> {
  return {
    settings: {
      texto: { provider: "groq", model_id: "llama-3.3-70b-versatile", timeout_s: 120 },
      codigo: { provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet", timeout_s: 180 },
      orquestador: { provider: "groq", model_id: "llama-3.3-70b-versatile", timeout_s: 90 },
      razonamiento: {
        provider: "openrouter",
        model_id: "anthropic/claude-3.5-sonnet",
        timeout_s: 90,
      },
    },
    catalog,
    catalogStatus: null,
    bounds: [30, 300],
    saving: false,
    loading: false,
    taskLabels: TASK_LABELS,
    categoryLabels: CATEGORY_LABELS,
    typeLabels: TYPE_LABELS,
    setModel: () => {},
    setTipoTimeout: () => {},
    resetTipo: () => {},
    ...overrides,
  };
}

const meta: Meta<LlmSettingsFormComponent> = {
  component: LlmSettingsFormComponent,
  title: "Features/LlmSettings/LlmSettingsForm",
  tags: ["autodocs"],
  args: {
    readOnly: false,
  },
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore() }],
    }),
  ],
};
export default meta;

type Story = StoryObj<LlmSettingsFormComponent>;

export const Default: Story = {};

export const ReadOnly: Story = {
  args: { readOnly: true },
};

export const Loading: Story = {
  decorators: [
    applicationConfig({
      providers: [
        { provide: UserLlmSettingsStore, useValue: makeStore({ loading: true, settings: null }) },
      ],
    }),
  ],
};

export const ProviderDown: Story = {
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: UserLlmSettingsStore,
          useValue: makeStore({
            catalogStatus: { openrouter: { ok: false, last_success_at: "2026-06-30T14:00:00Z" } },
          }),
        },
      ],
    }),
  ],
};
