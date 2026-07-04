import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { UserApiKeysCardComponent } from "./user-api-keys-card.component";

const meta: Meta<UserApiKeysCardComponent> = {
  component: UserApiKeysCardComponent,
  title: "Features/LlmSettings/UserApiKeysCard",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users/me/api-keys", () =>
          HttpResponse.json({
            api_keys: {
              groq: "gsk_...abcd",
              openrouter: "",
              opencode: "",
              siliconflow: "",
              runware: "",
              falai: "",
            },
          }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<UserApiKeysCardComponent>;

export const Default: Story = {};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [http.get("/api/users/me/api-keys", () => new Promise(() => undefined))],
    },
  },
};

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users/me/api-keys", () =>
          HttpResponse.json({ detail: "No se pudo cargar." }, { status: 500 }),
        ),
      ],
    },
  },
};
