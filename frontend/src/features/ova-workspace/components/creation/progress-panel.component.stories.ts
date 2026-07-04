import type { Meta, StoryObj } from "@storybook/angular";

import type { JobLike, ResourceVM } from "../../lib/ova-job-view-model";
import { ProgressPanelComponent } from "./progress-panel.component";

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
    phase: "engage",
    phaseLabel: "ENGAGE",
    label: "Storyboard de Video",
    emoji: "🎯",
    status: "generando",
    error_id: null,
    selectable: false,
  },
  {
    id: "3",
    phase: "explore",
    phaseLabel: "EXPLORE",
    label: "Simulador Virtual Lab",
    emoji: "🔍",
    status: "pendiente",
    error_id: null,
    selectable: false,
  },
];

const RUNNING_JOB: JobLike = { status: "running" };

const meta: Meta<ProgressPanelComponent> = {
  component: ProgressPanelComponent,
  title: "Features/OvaWorkspace/Creation/ProgressPanel",
  tags: ["autodocs"],
  args: {
    job: RUNNING_JOB,
    viewModel: SAMPLE_VM,
    selectedIds: [],
    activeId: "1",
    showCancel: true,
  },
};
export default meta;

type Story = StoryObj<ProgressPanelComponent>;

export const Running: Story = {};

export const WithFailures: Story = {
  args: {
    job: { status: "error" },
    viewModel: SAMPLE_VM.map((r, i) => (i === 2 ? { ...r, status: "X", error_id: "err_1a2b" } : r)),
    selectedIds: [],
    showCancel: false,
  },
};

export const SelectedFailures: Story = {
  args: {
    job: { status: "error" },
    viewModel: SAMPLE_VM.map((r, i) => (i === 2 ? { ...r, status: "X", error_id: "err_1a2b" } : r)),
    selectedIds: ["3"],
    showCancel: false,
  },
};

export const Done: Story = {
  args: {
    job: { status: "done" },
    viewModel: SAMPLE_VM.map((r) => ({ ...r, status: "check", error_id: null })),
    showCancel: false,
  },
};
