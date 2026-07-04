import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import type { ResourceVM } from "../../lib/ova-job-view-model";
import { CrearOvaPreviewPanelComponent } from "./crear-ova-preview-panel.component";

const SAMPLE_VM: ResourceVM[] = [
  {
    id: "1",
    phase: "engage",
    phaseLabel: "ENGAGE",
    label: "Cómic Interactivo",
    emoji: "🎯",
    status: "check",
    error_id: null,
    selectable: false,
  },
  {
    id: "2",
    phase: "explore",
    phaseLabel: "EXPLORE",
    label: "Simulador Virtual Lab",
    emoji: "🔍",
    status: "generando",
    error_id: null,
    selectable: false,
  },
];

const SAMPLE_HTML =
  "<html><body style='font-family:sans-serif;padding:2rem'><h1>Vista previa del recurso</h1><p>Contenido de ejemplo generado por la IA.</p></body></html>";

const meta: Meta<CrearOvaPreviewPanelComponent> = {
  component: CrearOvaPreviewPanelComponent,
  title: "Features/OvaWorkspace/Creation/CrearOvaPreviewPanel",
  tags: ["autodocs"],
  args: {
    jobId: "job-123",
    viewModel: SAMPLE_VM,
    pinnedId: null,
  },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/ova/jobs/:jobId/resources/:resourceId/content", () =>
          HttpResponse.json({ html: SAMPLE_HTML }),
        ),
      ],
    },
  },
};
export default meta;

type Story = StoryObj<CrearOvaPreviewPanelComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    viewModel: [],
  },
};

export const LoadFailure: Story = {
  args: {
    jobId: "job-error",
  },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/ova/jobs/:jobId/resources/:resourceId/content", () =>
          HttpResponse.json({ detail: "not found" }, { status: 404 }),
        ),
      ],
    },
  },
};
