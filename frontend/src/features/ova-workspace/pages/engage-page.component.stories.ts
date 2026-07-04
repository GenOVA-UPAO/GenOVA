import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { EngagePageComponent } from "./engage-page.component";

const sampleResources = [
  { id: 1, tipo: "Video introductorio", emoji: "🎬", interactividad: "Alta" },
  { id: 2, tipo: "Infografía", emoji: "🖼️", interactividad: "Media" },
];

const meta: Meta<EngagePageComponent> = {
  component: EngagePageComponent,
  title: "Features/OvaWorkspace/Pages/EngagePage",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ova-workspace/resources/:phase", () =>
          HttpResponse.json({ recursos: sampleResources }),
        ),
        http.get("*/api/admin/nodes-config", () =>
          HttpResponse.json({ video_api_key_configured: true }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<EngagePageComponent>;

export const Default: Story = {};
