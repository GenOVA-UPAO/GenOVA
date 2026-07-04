import type { Meta, StoryObj } from "@storybook/angular";

import type { Phase } from "../../lib/types";
import { WorkspaceChatPanelComponent } from "./workspace-chat-panel.component";
import type { RegenProgress, UploadsPropBag } from "./workspace-chat-panel.types";

const samplePhases: Phase[] = [
  { id: "phase-1", phase_type: "engage", title: "Video introductorio" },
  { id: "phase-2", phase_type: "explore", title: "Simulador interactivo" },
  { id: "phase-3", phase_type: "evaluate", title: "Quiz final" },
];

const idleUploads: UploadsPropBag = {
  uploads: [],
  activeUploadsCount: 0,
  maxUploadFiles: 5,
  isUploadingFiles: false,
  uploadError: "",
};

const withUploads: UploadsPropBag = {
  uploads: [
    {
      clientId: "1",
      uploadId: "up_1",
      filename: "apuntes-clase.pdf",
      contentType: "application/pdf",
      sizeBytes: 1_240_000,
      status: "success",
      message: "Carga exitosa",
      ragStatus: { status: "success", chunks: 8 },
    },
  ],
  activeUploadsCount: 1,
  maxUploadFiles: 5,
  isUploadingFiles: false,
  uploadError: "",
};

const idleProgress: RegenProgress = { percentage: 0, stage: "" };

const meta: Meta<WorkspaceChatPanelComponent> = {
  component: WorkspaceChatPanelComponent,
  title: "Features/OvaWorkspace/Editor/WorkspaceChatPanel",
  tags: ["autodocs"],
  args: {
    prompt: "",
    isRegenerating: false,
    uploads: idleUploads,
    regenProgress: idleProgress,
    phases: samplePhases,
    selectionMode: false,
    selectedPhaseIds: [],
    canRegenAll: true,
    canSelectAll: true,
  },
};
export default meta;

type Story = StoryObj<WorkspaceChatPanelComponent>;

export const Default: Story = {};

export const WithPrompt: Story = {
  args: { prompt: "Haz el enganche más visual y con ejemplos de la vida cotidiana." },
};

export const WithUploads: Story = {
  args: { uploads: withUploads },
};

export const SelectionMode: Story = {
  args: {
    selectionMode: true,
    selectedPhaseIds: ["phase-1", "phase-3"],
  },
};

export const Regenerating: Story = {
  args: {
    isRegenerating: true,
    regenProgress: { percentage: 45, stage: "Generando fase EXPLAIN…" },
  },
};
