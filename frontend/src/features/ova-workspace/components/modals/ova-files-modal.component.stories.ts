import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";

import { ButtonComponent } from "@/core/components/ui/button.component";

import type { UploadItem } from "../../lib/uploadTypes";
import { OvaFilesModalComponent } from "./ova-files-modal.component";

const SAMPLE_UPLOADS: UploadItem[] = [
  {
    clientId: "c1",
    uploadId: "u1",
    filename: "silabo.pdf",
    contentType: "application/pdf",
    sizeBytes: 245_678,
    status: "success",
    message: "Carga exitosa",
    ragStatus: { status: "success", chunks: 12 },
  },
  {
    clientId: "c2",
    uploadId: "u2",
    filename: "audio-clase.mp3",
    contentType: "audio/mpeg",
    sizeBytes: 1_048_576,
    status: "uploading",
    message: "Subiendo...",
  },
  {
    clientId: "c3",
    uploadId: "",
    filename: "corrupto.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeBytes: 12_000,
    status: "error",
    message: "No se pudo procesar el archivo.",
  },
];

/**
 * Wrapper story-only component: OvaFilesModalComponent's `open` is a plain
 * input, so a story needs local state to toggle it (mirrors UI/Dialog).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-files-modal-story",
  imports: [ButtonComponent, OvaFilesModalComponent],
  template: `
    <gn-button (onClick)="open.set(true)">Archivos de referencia</gn-button>
    <gn-ova-files-modal
      [open]="open()"
      [uploads]="uploads"
      [activeUploadsCount]="uploads.length"
      [maxUploadFiles]="5"
      (onOpenChange)="open.set($event)"
    ></gn-ova-files-modal>
  `,
})
class OvaFilesModalStoryComponent {
  protected readonly open = signal(true);
  uploads: UploadItem[] = SAMPLE_UPLOADS;
}

const meta: Meta<OvaFilesModalStoryComponent> = {
  component: OvaFilesModalStoryComponent,
  title: "Features/OvaWorkspace/Modals/OvaFilesModal",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<OvaFilesModalStoryComponent>;

export const WithFiles: Story = {};

export const Empty: Story = {
  args: {
    uploads: [],
  },
};

export const LimitReached: Story = {
  args: {
    uploads: [
      ...SAMPLE_UPLOADS,
      {
        clientId: "c4",
        uploadId: "u4",
        filename: "foto.jpg",
        contentType: "image/jpeg",
        sizeBytes: 500_000,
        status: "success",
        message: "Carga exitosa",
      },
      {
        clientId: "c5",
        uploadId: "u5",
        filename: "otro.png",
        contentType: "image/png",
        sizeBytes: 300_000,
        status: "success",
        message: "Carga exitosa",
      },
    ],
  },
};
