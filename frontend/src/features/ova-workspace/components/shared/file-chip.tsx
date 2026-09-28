import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import { type UploadPhase, uploadPhase } from "../../lib/upload-rag-status";
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
  const type = extension
    ? extension.toUpperCase()
    : (file.contentType.split("/").pop()?.toUpperCase() ?? "");
  return [type, formatSize(file.sizeBytes)].filter(Boolean).join(" · ");
}

const PHASE_STYLE: Record<
  UploadPhase,
  { icon?: string; spin?: boolean; tone: string; chip: string }
> = {
  uploading: { icon: "spinner", spin: true, tone: "text-muted-foreground", chip: "border-border" },
  indexing: { icon: "spinner", spin: true, tone: "text-primary", chip: "border-primary/30" },
  ready: { icon: "check-circle", tone: "text-success-strong", chip: "border-border" },
  unusable: { icon: "warning-circle", tone: "text-destructive", chip: "border-destructive/40" },
  disabled: {
    icon: "prohibit",
    tone: "text-muted-foreground",
    chip: "border-dashed border-border",
  },
};

/** Un archivo adjunto con su estado: subiendo, indexando, listo, o por qué no se usará. */
export function FileChip({
  file,
  onRemove,
}: Readonly<{ file: UploadItem; onRemove: (id: string) => void }>) {
  const meta = metaOf(file);
  const state = uploadPhase(file);
  const style = PHASE_STYLE[state.phase];
  return (
    <li
      title={state.phase === "ready" ? state.detail : undefined}
      className={cn(
        "flex max-w-full items-center gap-2 rounded-xl border bg-muted/50 py-1.5 pr-1 pl-2.5 text-xs shadow-sm",
        style.chip,
      )}
    >
      <Icon
        name={iconNameFor(extensionOf(file.filename))}
        size="text-base"
        className="text-muted-foreground"
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium" title={file.filename}>
          {file.filename}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
          {meta !== "" && <span className="shrink-0">{meta} ·</span>}
          <span className={cn("flex min-w-0 items-center gap-0.5 font-medium", style.tone)}>
            {style.icon && (
              <Icon
                name={style.icon}
                className={cn("size-3 shrink-0", style.spin && "animate-spin")}
              />
            )}
            <span className="truncate">{state.label}</span>
          </span>
        </span>
        {state.detail && state.phase !== "ready" && (
          <span className="max-w-64 text-[10px] leading-snug text-muted-foreground">
            {state.detail}
          </span>
        )}
      </span>
      {state.phase !== "uploading" && (
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
      )}
    </li>
  );
}
