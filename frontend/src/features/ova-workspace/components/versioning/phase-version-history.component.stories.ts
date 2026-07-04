import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import type { PhaseMicroVersion } from "../../lib/version-history.types";
import { PhaseVersionHistoryComponent } from "./phase-version-history.component";

const sampleMicroVersions: PhaseMicroVersion[] = [
  {
    id: "mv-1",
    minor_number: 2,
    content: "<h1>¿Sabías que...?</h1><p>Versión actual del recurso.</p>",
    created_at: "2026-06-30T10:00:00Z",
  },
  {
    id: "mv-2",
    minor_number: 1,
    content: "<h1>¿Sabías que...?</h1><p>Versión anterior del recurso.</p>",
    created_at: "2026-06-20T09:00:00Z",
  },
];

const meta: Meta<PhaseVersionHistoryComponent> = {
  component: PhaseVersionHistoryComponent,
  title: "Features/OvaWorkspace/Versioning/PhaseVersionHistory",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ovas/:ovaId/fases/:phaseId/versiones", () =>
          HttpResponse.json({ micro_versions: sampleMicroVersions }),
        ),
      ],
    },
  },
  args: {
    open: true,
    ovaId: "ova-123",
    phaseId: "phase-1",
  },
};
export default meta;

type Story = StoryObj<PhaseVersionHistoryComponent>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ovas/:ovaId/fases/:phaseId/versiones", () =>
          HttpResponse.json({ micro_versions: [] }),
        ),
      ],
    },
  },
};

export const Closed: Story = {
  args: { open: false },
};
