import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import type { PhaseWithContent } from "../../lib/types";
import { WorkspacePhaseItemComponent } from "./workspace-phase-item.component";

const samplePhase: PhaseWithContent = {
  id: "phase-1",
  phase_type: "engage",
  title: "Video introductorio",
  content:
    "<h1>¿Sabías que...?</h1><p>Contenido HTML generado para enganchar al estudiante con una pregunta disparadora.</p>",
  regenerated: false,
};

const meta: Meta<WorkspacePhaseItemComponent> = {
  component: WorkspacePhaseItemComponent,
  title: "Features/OvaWorkspace/Editor/WorkspacePhaseItem",
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
    phase: samplePhase,
    isDragging: false,
    ovaId: "ova-123",
  },
};
export default meta;

type Story = StoryObj<WorkspacePhaseItemComponent>;

export const Default: Story = {};

export const Dragging: Story = {
  args: { isDragging: true },
};

export const Regenerated: Story = {
  args: {
    phase: { ...samplePhase, regenerated: true },
  },
};

export const Empty: Story = {
  args: {
    phase: { ...samplePhase, content: "" },
  },
};
