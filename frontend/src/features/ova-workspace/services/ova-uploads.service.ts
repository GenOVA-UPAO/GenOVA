import { computed, Injectable, signal } from "@angular/core";
import { validateFileAdd, UPLOAD_MAX_FILES } from "../lib/upload-chip-view-model";
import type { RagStatus, UploadItem } from "../lib/uploadTypes";
import { deleteTempFile, listTempFiles, type ServerItem, uploadTempFiles } from "./upload.service";

function generateClientId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fromServerItem(item: ServerItem): UploadItem {
  return {
    clientId: generateClientId(),
    uploadId: item.upload_id,
    filename: item.filename,
    contentType: item.content_type,
    sizeBytes: Number(item.size_bytes || 0),
    status: "success",
    message: "Carga exitosa",
    ragStatus: (item.rag_status ?? null) as RagStatus | null,
  };
}

function toUploadingItem(file: File): UploadItem {
  return {
    clientId: generateClientId(),
    uploadId: "",
    filename: file.name,
    contentType: file.type || "",
    sizeBytes: Number(file.size || 0),
    status: "uploading",
    message: "Subiendo...",
  };
}

@Injectable({ providedIn: "root" })
export class OvaUploadsService {
  private uploadsState = signal<UploadItem[]>([]);
  private uploadErrorState = signal("");
  private isUploadingState = signal(false);

  uploads = this.uploadsState.asReadonly();
  uploadError = this.uploadErrorState.asReadonly();
  isUploadingFiles = this.isUploadingState.asReadonly();
  maxUploadFiles = UPLOAD_MAX_FILES;

  uploadIds = computed(() =>
    this.uploadsState()
      .filter((i) => i.status === "success" && i.uploadId)
      .map((i) => i.uploadId),
  );

  activeUploadsCount = computed(() => this.uploadsState().length);

  constructor() {
    void this.loadTempUploads();
  }

  async loadTempUploads() {
    try {
      const data = await listTempFiles();
      const items = Array.isArray(data?.items) ? data.items : [];
      this.uploadsState.set(items.map(fromServerItem));
    } catch {
      this.uploadsState.set([]);
    }
  }

  async handleFilesSelected(fileList: FileList | File[]) {
    const selectedFiles = Array.from(fileList || []);
    if (selectedFiles.length === 0) return;

    this.uploadErrorState.set("");
    const limitError = validateFileAdd(
      this.activeUploadsCount(),
      selectedFiles.length,
      UPLOAD_MAX_FILES,
    );
    if (limitError) {
      this.uploadErrorState.set(limitError);
      return;
    }

    const uploadingItems = selectedFiles.map(toUploadingItem);
    this.uploadsState.update((prev) => [...prev, ...uploadingItems]);
    this.isUploadingState.set(true);

    await Promise.all(
      uploadingItems.map(async (item, index) => {
        try {
          const result = await uploadTempFiles([selectedFiles[index]]);
          const saved = result?.items?.[0];
          const failure = result?.errors?.[0];
          if (saved) {
            this.uploadsState.update((prev) =>
              prev.map((cur) =>
                cur.clientId === item.clientId
                  ? {
                      ...cur,
                      uploadId: saved.upload_id,
                      filename: saved.filename,
                      contentType: saved.content_type,
                      sizeBytes: Number(saved.size_bytes || cur.sizeBytes),
                      status: "success" as const,
                      message: "Carga exitosa",
                      ragStatus: (saved.rag_status ?? null) as RagStatus | null,
                    }
                  : cur,
              ),
            );
            return;
          }
          const msg = failure?.message || "No se pudo cargar el archivo.";
          this.patchItem(item.clientId, { status: "error", message: msg });
        } catch (err: unknown) {
          this.patchItem(item.clientId, {
            status: "error",
            message: err instanceof Error ? err.message : "Error al subir archivo.",
          });
        }
      }),
    );

    this.isUploadingState.set(false);
  }

  async handleRemoveUpload(clientId: string) {
    const target = this.uploadsState().find((i) => i.clientId === clientId);
    if (!target) return;
    if (target.uploadId) {
      try {
        await deleteTempFile(target.uploadId);
      } catch {
        // expired on backend — still clear UI
      }
    }
    this.uploadsState.update((prev) => prev.filter((i) => i.clientId !== clientId));
  }

  private patchItem(clientId: string, patch: Partial<UploadItem>) {
    this.uploadsState.update((prev) =>
      prev.map((cur) => (cur.clientId === clientId ? { ...cur, ...patch } : cur)),
    );
  }
}
