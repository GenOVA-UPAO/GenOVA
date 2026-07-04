import type { Meta, StoryObj } from "@storybook/angular";
import { applicationConfig } from "@storybook/angular";

import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { UserOverrideSectionComponent } from "./user-override-section.component";

const sampleCatalog = {
  texto: [
    { provider: "groq", model_id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    {
      provider: "openrouter",
      model_id: "anthropic/claude-3.5-sonnet",
      label: "Claude 3.5 Sonnet",
    },
  ],
};

function seededStore(overrides: Partial<UserLlmSettingsStore> = {}): UserLlmSettingsStore {
  const store = new UserLlmSettingsStore();
  store.catalog = sampleCatalog;
  store.settings = {
    texto: {
      provider: "groq",
      model_id: "llama-3.3-70b-versatile",
      timeout_s: 120,
      fallbacks: [{ provider: "openrouter", model_id: "anthropic/claude-3.5-sonnet" }],
    },
  };
  Object.assign(store, overrides);
  return store;
}

const meta: Meta<UserOverrideSectionComponent> = {
  component: UserOverrideSectionComponent,
  title: "Features/LlmSettings/UserOverrideSection",
  tags: ["autodocs"],
  decorators: [
    applicationConfig({
      providers: [{ provide: UserLlmSettingsStore, useFactory: () => seededStore() }],
    }),
  ],
  args: {
    task: "texto",
    chip: "bg-primary/8 text-primary border-primary/20",
    num: "text-primary font-black",
    userDisabled: false,
    bounds: [30, 300],
  },
};
export default meta;

type Story = StoryObj<UserOverrideSectionComponent>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { userDisabled: true },
};

export const NoFallbacks: Story = {
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: UserLlmSettingsStore,
          useFactory: () =>
            seededStore({
              settings: {
                texto: {
                  provider: "groq",
                  model_id: "llama-3.3-70b-versatile",
                  timeout_s: 120,
                  fallbacks: [],
                },
              },
            }),
        },
      ],
    }),
  ],
};
