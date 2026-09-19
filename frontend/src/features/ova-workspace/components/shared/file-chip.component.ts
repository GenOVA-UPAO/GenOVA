import { ChangeDetectionStrategy, Component, Input, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

import { formatSize } from "../../lib/upload-formatters";
import type { UploadItem } from "../../lib/upload-types";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-file-chip",
  imports: [IconComponent],
  template: `
    <div
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shadow-sm transition duration-200 hover:shadow-md bg-muted text-foreground border-border"
    >
      <gn-icon [name]="icon" size="text-sm" />
      <div class="flex flex-col min-w-0">
        <span class="max-w-[130px] truncate font-semibold" [title]="file.filename">
          {{ file.filename }}
        </span>
        <span class="text-[9px] opacity-75">
          {{ formattedSize }}
        </span>
      </div>
      <div class="ml-1 flex items-center gap-1">
        @if (file.status === "uploading") {
          <span class="text-[10px] text-primary animate-pulse font-medium"> Subiendo... </span>
        }

        @if (file.status === "error") {
          <span class="text-[10px] text-destructive font-semibold" [title]="file.message">
            Error
          </span>
        }

        @if (file.status === "success" && file.ragStatus) {
          @if (file.ragStatus.status === "success") {
            <span
              class="text-[10px] text-primary font-bold bg-primary/10 px-1 rounded-sm"
              [title]="'Ingestado en RAG: ' + (file.ragStatus.chunks || 0) + ' fragmentos'"
            >
              RAG ({{ file.ragStatus.chunks || 0 }})
            </span>
          }
          @if (file.ragStatus.status === "error") {
            <span
              class="text-[10px] text-destructive font-medium"
              [title]="file.ragStatus.message || 'Error RAG'"
            >
              Fallo RAG
            </span>
          }
          @if (file.ragStatus.status !== "success" && file.ragStatus.status !== "error") {
            <span class="text-[10px] text-muted-foreground">Listo</span>
          }
        }

        @if (file.status === "success" && !file.ragStatus) {
          <span class="text-[10px] text-primary font-medium">Listo</span>
        }

        <button
          type="button"
          (click)="onRemove.emit(file.clientId)"
          [disabled]="disabled()"
          class="p-0.5 rounded-full hover:bg-foreground/5 text-current/60 hover:text-current cursor-pointer transition-colors"
          title="Quitar"
          aria-label="Quitar"
        >
          <gn-icon name="x" size="text-xs" />
        </button>
      </div>
    </div>
  `,
})
export class FileChipComponent {
  @Input() file!: UploadItem;
  readonly disabled = input(false);
  readonly onRemove = output<string>();

  get extension() {
    return this.file.filename.split(".").pop()?.toLowerCase() ?? "";
  }

  /** Phosphor icon slug (without `ph-` prefix) for the file's extension. */
  get icon() {
    const ext = this.extension;
    if (ext === "pdf") return "file-pdf";
    if (["docx", "pptx"].includes(ext)) return "file-doc";
    if (["mp3", "wav", "m4a", "aac", "ogg", "webm"].includes(ext)) return "music-notes";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
    return "file-text";
  }

  get formattedSize() {
    return this.file.sizeBytes ? formatSize(this.file.sizeBytes) : "";
  }
}
