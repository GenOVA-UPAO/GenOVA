import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { UploadItem } from "../../lib/upload-types";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "ogg"];
const PRESENTATION_EXTENSIONS = ["ppt", "pptx"];

function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function iconNameFor(extension: string): string {
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (AUDIO_EXTENSIONS.includes(extension)) return "microphone";
  if (PRESENTATION_EXTENSIONS.includes(extension)) return "presentation-chart";
  return "clipboard-text";
}

function formatSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "";
  const megabytes = sizeBytes / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(1)} MB`;
  return `${String(Math.max(1, Math.round(sizeBytes / 1024)))} KB`;
}

function metaOf(file: UploadItem): string {
  const extension = extensionOf(file.filename);
  const type = extension ? extension.toUpperCase() : (file.contentType.split("/").pop()?.toUpperCase() ?? "");
  return [type, formatSize(file.sizeBytes)].filter(Boolean).join(" · ");
}

export function FileChips({ files, onRemove }: Readonly<{ files: UploadItem[]; onRemove: (id: string) => void }>) {
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((file) => {
        const meta = metaOf(file);
        return (
          <li
            key={file.clientId}
            className="flex max-w-full items-center gap-2 rounded-xl border border-border bg-muted/50 py-1.5 pr-1 pl-2.5 text-xs shadow-sm"
          >
            <Icon name={iconNameFor(extensionOf(file.filename))} size="text-base" className="text-muted-foreground" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium" title={file.filename}>
                {file.filename}
              </span>
              {meta !== "" && <span className="truncate text-[10px] text-muted-foreground">{meta}</span>}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Eliminar ${file.filename}`}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => {
                onRemove(file.clientId);
              }}
            >
              <Icon name="x" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
