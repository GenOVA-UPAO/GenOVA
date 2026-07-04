import { applicationConfig, type Meta, type StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { CATEGORY_LABELS, TASK_LABELS, TYPE_LABELS } from "../lib/llm-settings-labels";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { LlmSettingsModalComponent } from "./llm-settings-modal.component";

const catalog: Record<string, CatalogModel[]> = {
  groq: [
    {
      provider: "groq",
      model_id: "llama-3.3-70b-versatile",
      label: "Llama 3.3 70B",
      context_length: 128_000,
    },
  ],
};

function makeStore(overrides: Partial<UserLlmSettingsStore> = {}): Partial<UserLlmSettingsStore> {
  return {
    settings: {
      texto: { provider: "groq", model_id: "llama-3.3-70b-versatile", timeout_s: 120 },
    },
    catalog,
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
    resetTipo: () => {},
    load: () => Promise.resolve(),
    save: () => Promise.resolve(true),
    ...overrides,
  };
}

const meta: Meta<LlmSettingsModalComponent> = {
  component: LlmSettingsModalComponent,
  title: "Features/LlmSettings/LlmSettingsModal",
  tags: ["autodocs"],
  args: {
    open: true,
  },
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore() }],
    }),
  ],
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users/me/llm-settings", () =>
          HttpResponse.json({
            settings: { texto: { provider: "groq", model_id: "llama-3.3-70b-versatile" } },
            catalog,
            has_own_llm_key: true,
          }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<LlmSettingsModalComponent>;

export const Default: Story = {};

export const NoOwnKey: Story = {
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore({ hasOwnLlmKey: false }) }],
    }),
  ],
};

export const Saving: Story = {
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useValue: makeStore({ saving: true }) }],
    }),
  ],
};

export const Closed: Story = {
  args: { open: false },
};
