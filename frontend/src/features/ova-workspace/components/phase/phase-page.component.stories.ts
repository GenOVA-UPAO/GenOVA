import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { PhasePageComponent } from "./phase-page.component";

const sampleResources = [
  { id: 1, tipo: "Video introductorio", emoji: "🎬", interactividad: "Alta" },
  { id: 2, tipo: "Infografía", emoji: "🖼️", interactividad: "Media" },
  { id: 3, tipo: "Lectura guiada", emoji: "📖", interactividad: "Baja" },
];

const meta: Meta<PhasePageComponent> = {
  component: PhasePageComponent,
  title: "Features/OvaWorkspace/Phase/PhasePage",
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
        http.post("*/api/ova-workspace/generate/:phase", () =>
          HttpResponse.json({
            html_content: "<h1>Recurso generado</h1>",
            resource_type: "video",
            concepto: "Segunda ley de Newton",
            emoji: "🎯",
            tipo: "Video introductorio",
            duracion: "3 min",
            interactividad: "Alta",
          }),
        ),
      ],
    },
  },
  args: {
    phase: "ENGAGE",
    emoji: "🎯",
    description:
      "Selecciona un tipo de recurso, escribe el concepto de ML y genera el material con IA real.",
  },
};
export default meta;

type Story = StoryObj<PhasePageComponent>;

export const Default: Story = {};

export const NoVideoKeyConfigured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ova-workspace/resources/:phase", () =>
          HttpResponse.json({ recursos: sampleResources }),
        ),
        http.get("*/api/admin/nodes-config", () =>
          HttpResponse.json({ video_api_key_configured: false }),
        ),
      ],
    },
  },
};

export const EmptyResources: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ova-workspace/resources/:phase", () => HttpResponse.json({ recursos: [] })),
        http.get("*/api/admin/nodes-config", () =>
          HttpResponse.json({ video_api_key_configured: true }),
        ),
      ],
    },
  },
};
