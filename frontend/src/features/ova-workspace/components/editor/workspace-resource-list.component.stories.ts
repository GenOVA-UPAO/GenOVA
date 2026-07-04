import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import type { PhaseWithContent } from "../../lib/types";
import { WorkspaceResourceListComponent } from "./workspace-resource-list.component";

const enganchePhases: PhaseWithContent[] = [
  {
    id: "phase-1",
    phase_type: "engage",
    title: "Video introductorio",
    content: "<h1>¿Sabías que...?</h1><p>Contenido de enganche generado por IA.</p>",
  },
  {
    id: "phase-2",
    phase_type: "engage",
    title: "Pregunta disparadora",
    content: "<p>¿Qué pasaría si duplicamos la fuerza aplicada?</p>",
  },
];

const meta: Meta<WorkspaceResourceListComponent> = {
  component: WorkspaceResourceListComponent,
  title: "Features/OvaWorkspace/Editor/WorkspaceResourceList",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ovas/:ovaId/fases/:phaseId/versiones", () =>
          HttpResponse.json({ micro_versions: [] }),
        ),
      ],
    },
  },
  args: {
    phases: enganchePhases,
    phaseType: "engage",
    ovaId: "ova-123",
  },
};
export default meta;

type Story = StoryObj<WorkspaceResourceListComponent>;

export const Default: Story = {};

export const FullCapacity: Story = {
  args: {
    phases: [
      ...enganchePhases,
      { id: "phase-3", phase_type: "engage", title: "Recurso 3", content: "<p>Recurso 3</p>" },
      { id: "phase-4", phase_type: "engage", title: "Recurso 4", content: "<p>Recurso 4</p>" },
    ],
  },
};

export const Empty: Story = {
  args: { phases: [] },
};
