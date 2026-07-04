import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { MediaTaskCardComponent } from "./media-task-card.component";

const meta: Meta<MediaTaskCardComponent> = {
  component: MediaTaskCardComponent,
  title: "Features/LlmSettings/MediaTaskCard",
  tags: ["autodocs"],
  args: {
    task: "imagen",
    index: 0,
  },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/users/me/ova-settings", () =>
          HttpResponse.json({
            settings: { image_provider: "huggingface", image_model: "flux-schnell" },
          }),
        ),
        http.get("/api/users/me/image-models", () =>
          HttpResponse.json({
            models: [
              { id: "flux-schnell", label: "FLUX.1 Schnell" },
              { id: "sdxl", label: "Stable Diffusion XL" },
            ],
          }),
        ),
        http.put("/api/users/me/ova-settings", () => HttpResponse.json({ ok: true })),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<MediaTaskCardComponent>;

export const ImageTask: Story = {};

export const VideoTask: Story = {
  args: { task: "video" },
};
