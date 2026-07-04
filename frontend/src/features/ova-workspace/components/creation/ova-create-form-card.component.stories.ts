import type { Meta, StoryObj } from "@storybook/angular";

import type { UploadItem, UploadsProps } from "../../lib/uploadTypes";
import { OvaCreateFormCardComponent } from "./ova-create-form-card.component";

function buildUploadsProps(uploads: UploadItem[] = []): UploadsProps {
  return {
    uploads,
    activeUploadsCount: uploads.length,
    maxUploadFiles: 5,
    isUploadingFiles: false,
    uploadError: "",
    disabled: false,
    onFilesSelected: () => undefined,
    onRemove: () => undefined,
  };
}

const SAMPLE_UPLOADS: UploadItem[] = [
  {
    clientId: "c1",
    uploadId: "u1",
    filename: "silabo.pdf",
    contentType: "application/pdf",
    sizeBytes: 245_678,
    status: "success",
    message: "",
    ragStatus: { status: "success", chunks: 12 },
  },
];

const meta: Meta<OvaCreateFormCardComponent> = {
  component: OvaCreateFormCardComponent,
  title: "Features/OvaWorkspace/Creation/OvaCreateFormCard",
  tags: ["autodocs"],
  args: {
    prompt: "",
    minChars: 10,
    canGenerate: false,
    totalResources: 0,
    selections: {},
    theme: { color: "upao", design: "upao" },
    error: "",
    uploadsProps: buildUploadsProps(),
  },
};
export default meta;

type Story = StoryObj<OvaCreateFormCardComponent>;

export const Empty: Story = {};

export const ReadyToGenerate: Story = {
  args: {
    prompt: "Introducción a redes neuronales para estudiantes de pregrado en ingeniería.",
    canGenerate: true,
    totalResources: 3,
    selections: {
      engage: [{ id: 1, tipo: "Cómic Interactivo", emoji: "🎯" }],
      explore: [{ id: 1, tipo: "Simulador Virtual Lab", emoji: "🔍" }],
      explain: [{ id: 1, tipo: "Video Teórico", emoji: "💡" }],
    },
    uploadsProps: buildUploadsProps(SAMPLE_UPLOADS),
  },
};

export const WithError: Story = {
  args: {
    prompt: "Tema muy corto",
    error: "El prompt debe tener al menos 10 caracteres.",
  },
};

export const FreeTheme: Story = {
  args: {
    theme: { color: "free", design: "free" },
  },
};
