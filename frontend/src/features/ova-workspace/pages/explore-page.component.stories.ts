import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { ExplorePageComponent } from "./explore-page.component";

const sampleResources = [
  { id: 1, tipo: "Simulador interactivo", emoji: "🧪", interactividad: "Alta" },
  { id: 2, tipo: "Laboratorio virtual", emoji: "🔬", interactividad: "Alta" },
];

const meta: Meta<ExplorePageComponent> = {
  component: ExplorePageComponent,
  title: "Features/OvaWorkspace/Pages/ExplorePage",
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

type Story = StoryObj<ExplorePageComponent>;

export const Default: Story = {};
