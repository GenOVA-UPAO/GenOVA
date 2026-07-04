import type { Meta, StoryObj } from "@storybook/angular";

import type { ResourceVM } from "../../lib/ova-job-view-model";
import { TotalFailurePanelComponent } from "./total-failure-panel.component";

const FAILED_VM: ResourceVM[] = [
  {
    id: "1",
    phase: "engage",
    phaseLabel: "ENGAGE",
    label: "Cómic Interactivo",
    emoji: "🎯",
    status: "X",
    error_id: "err_7c3d",
    selectable: true,
  },
  {
    id: "2",
    phase: "explore",
    phaseLabel: "EXPLORE",
    label: "Simulador Virtual Lab",
    emoji: "🔍",
    status: "X",
    error_id: "err_7c3d",
    selectable: true,
  },
];

const meta: Meta<TotalFailurePanelComponent> = {
  component: TotalFailurePanelComponent,
  title: "Features/OvaWorkspace/Creation/TotalFailurePanel",
  tags: ["autodocs"],
  args: {
    viewModel: FAILED_VM,
  },
};
export default meta;

type Story = StoryObj<TotalFailurePanelComponent>;

export const Default: Story = {};

export const WithoutErrorId: Story = {
  args: {
    viewModel: FAILED_VM.map((r) => ({ ...r, error_id: null })),
  },
};
