import type { Meta, StoryObj } from "@storybook/angular";

import type { ResourceVM } from "../../lib/ova-job-view-model";
import { CreationResourceListComponent } from "./creation-resource-list.component";

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
    status: "X",
    error_id: "err_9f8a",
    selectable: true,
  },
  {
    id: "4",
    phase: "explore",
    phaseLabel: "EXPLORE",
    label: "Agente Socrático",
    emoji: "🔍",
    status: "pendiente",
    error_id: null,
    selectable: false,
  },
];

const meta: Meta<CreationResourceListComponent> = {
  component: CreationResourceListComponent,
  title: "Features/OvaWorkspace/Creation/CreationResourceList",
  tags: ["autodocs"],
  args: {
    viewModel: SAMPLE_VM,
    selectedIds: [],
    activeId: "1",
  },
};
export default meta;

type Story = StoryObj<CreationResourceListComponent>;

export const Default: Story = {};

export const WithSelectedFailures: Story = {
  args: {
    selectedIds: ["3"],
  },
};

export const AllDone: Story = {
  args: {
    viewModel: SAMPLE_VM.map((r) => ({ ...r, status: "check", error_id: null, selectable: false })),
  },
};
