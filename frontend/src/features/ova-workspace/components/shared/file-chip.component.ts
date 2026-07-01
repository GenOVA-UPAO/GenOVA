import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { formatSize } from "../../lib/uploadFormatters";
import type { UploadItem } from "../../lib/uploadTypes";

@Component({
  selector: "gn-file-chip",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shadow-sm transition duration-200 hover:shadow-md bg-muted text-foreground border-border"
    >
      <span class="text-sm select-none">{{ icon }}</span>
      <div class="flex flex-col min-w-0">
        <span
          class="max-w-[130px] truncate font-semibold"
          [title]="file.filename"
        >
          {{ file.filename }}
        </span>
        <span class="text-[9px] opacity-75">
          {{ formattedSize }}
        </span>
      </div>
      <div class="ml-1 flex items-center gap-1">
        
        <ng-container *ngIf="file.status === 'uploading'">
          <span class="text-[10px] text-primary animate-pulse font-medium">
            Subiendo...
          </span>
        </ng-container>
        
        <ng-container *ngIf="file.status === 'error'">
          <span
            class="text-[10px] text-destructive font-semibold"
            [title]="file.message"
          >
            Error
          </span>
        </ng-container>
        
        <ng-container *ngIf="file.status === 'success' && file.ragStatus">
          <ng-container *ngIf="file.ragStatus.status === 'success'">
            <span
              class="text-[10px] text-primary font-bold bg-primary/10 px-1 rounded-sm"
              [title]="'Ingestado en RAG: ' + (file.ragStatus.chunks || 0) + ' fragmentos'"
            >
              RAG ({{ file.ragStatus.chunks || 0 }})
            </span>
          </ng-container>
          <ng-container *ngIf="file.ragStatus.status === 'error'">
            <span
              class="text-[10px] text-destructive font-medium"
              [title]="file.ragStatus.message || 'Error RAG'"
            >
              Fallo RAG
            </span>
          </ng-container>
          <ng-container *ngIf="file.ragStatus.status !== 'success' && file.ragStatus.status !== 'error'">
            <span class="text-[10px] text-muted-foreground">Listo</span>
          </ng-container>
        </ng-container>

        <ng-container *ngIf="file.status === 'success' && !file.ragStatus">
          <span class="text-[10px] text-primary font-medium">Listo</span>
        </ng-container>

        <button
          type="button"
          (click)="onRemove.emit(file.clientId)"
          [disabled]="disabled"
          class="p-0.5 rounded-full hover:bg-foreground/5 text-current/60 hover:text-current cursor-pointer transition-colors"
          title="Quitar"
        >
          <svg
            aria-hidden="true"
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class FileChipComponent {
  @Input() file!: UploadItem;
  @Input() disabled = false;
  @Output() onRemove = new EventEmitter<string>();

  get extension() {
    return this.file.filename.split(".").pop()?.toLowerCase() ?? "";
  }

  get icon() {
    const ext = this.extension;
    if (ext === "pdf") return "📕";
    if (["docx", "pptx"].includes(ext)) return "📘";
    if (["mp3", "wav", "m4a", "aac", "ogg", "webm"].includes(ext)) return "🎵";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "🖼️";
    return "📄";
  }

  get formattedSize() {
    return this.file.sizeBytes ? formatSize(this.file.sizeBytes) : "";
  }
}
