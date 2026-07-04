import type { Meta, StoryObj } from "@storybook/angular";

import type { UploadItem } from "../../lib/uploadTypes";
import { FileChipComponent } from "./file-chip.component";

const uploadingFile: UploadItem = {
  clientId: "1",
  uploadId: "",
  filename: "diapositivas-clase.pptx",
  contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  sizeBytes: 245_000,
  status: "uploading",
  message: "Subiendo...",
};

const successFile: UploadItem = {
  clientId: "2",
  uploadId: "up_123",
  filename: "apuntes-clase.pdf",
  contentType: "application/pdf",
  sizeBytes: 1_240_000,
  status: "success",
  message: "Carga exitosa",
  ragStatus: { status: "success", chunks: 12 },
};

const errorFile: UploadItem = {
  clientId: "3",
  uploadId: "",
  filename: "audio-clase.mp3",
  contentType: "audio/mpeg",
  sizeBytes: 3_400_000,
  status: "error",
  message: "El archivo excede el tamaño máximo permitido.",
};

const meta: Meta<FileChipComponent> = {
  component: FileChipComponent,
  title: "Features/OvaWorkspace/Shared/FileChip",
  tags: ["autodocs"],
  args: {
    file: successFile,
    disabled: false,
  },
};
export default meta;

type Story = StoryObj<FileChipComponent>;

export const Default: Story = {};

export const Uploading: Story = {
  args: { file: uploadingFile },
};

export const Error: Story = {
  args: { file: errorFile },
};

export const RagFailed: Story = {
  args: {
    file: {
      ...successFile,
      clientId: "4",
      filename: "manual-laboratorio.docx",
      ragStatus: { status: "error", message: "No se pudo indexar el documento." },
    },
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
