import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import type { OvaVersionRow } from "../../lib/version-history.types";
import { VersionHistoryPanelComponent } from "./version-history-panel.component";

const sampleVersions: OvaVersionRow[] = [
  { id: "version-1", version_number: 3, is_active: true, created_at: "2026-06-30T10:00:00Z" },
  { id: "version-0", version_number: 2, is_active: false, created_at: "2026-06-20T10:00:00Z" },
  { id: "version-a", version_number: 1, is_active: false, created_at: "2026-06-10T10:00:00Z" },
];

const meta: Meta<VersionHistoryPanelComponent> = {
  component: VersionHistoryPanelComponent,
  title: "Features/OvaWorkspace/Versioning/VersionHistoryPanel",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/ovas/:ovaId/versiones/diff", () =>
          HttpResponse.json({
            v1: {
              version: { version_number: 2 },
              phases: [{ id: "phase-1", phase_type: "engage", content: "Contenido v2" }],
            },
            v2: {
              version: { version_number: 3 },
              phases: [{ id: "phase-1", phase_type: "engage", content: "Contenido v3" }],
            },
          }),
        ),
      ],
    },
  },
  args: {
    open: true,
    ovaId: "ova-123",
    versions: sampleVersions,
    currentVersionId: "version-1",
  },
};
export default meta;

type Story = StoryObj<VersionHistoryPanelComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { versions: [] },
};

export const Closed: Story = {
  args: { open: false },
};
