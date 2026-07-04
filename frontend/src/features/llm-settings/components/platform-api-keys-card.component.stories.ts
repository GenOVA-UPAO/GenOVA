import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { PlatformApiKeysCardComponent } from "./platform-api-keys-card.component";

const meta: Meta<PlatformApiKeysCardComponent> = {
  component: PlatformApiKeysCardComponent,
  title: "Features/LlmSettings/PlatformApiKeysCard",
  tags: ["autodocs"],
  args: {
    userOwned: false,
  },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/admin/platform-config", () =>
          HttpResponse.json({
            platform_config: {
              groq: "gsk_...abcd",
              openrouter: "",
              opencode: "",
            },
            providers: ["groq", "openrouter", "opencode", "siliconflow", "runware", "falai"],
          }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<PlatformApiKeysCardComponent>;

export const Default: Story = {};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [http.get("/api/admin/platform-config", () => new Promise(() => undefined))],
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/admin/platform-config", () =>
          HttpResponse.json({ detail: "No se pudo cargar la configuración." }, { status: 500 }),
        ),
      ],
    },
  },
};
