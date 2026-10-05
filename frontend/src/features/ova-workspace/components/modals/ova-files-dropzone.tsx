import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

const ACCEPTED_ATTR = ".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp";

interface Props {
  count: number;
  max: number;
  uploading: boolean;
  onFiles: (files: FileList) => void;
}

export function OvaFilesDropzone({ count, max, uploading, onFiles }: Readonly<Props>) {
  const { t } = useTranslation();
  const ACCEPTED_LABEL = t("workspace:pdf_docx_pptx_mp3_wav_m4a_jpg_png_o_webp");
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const full = count >= max;
  const disabled = uploading || full;

  let headline = t("workspace:arrastra_archivos_aqui_o_haz_clic_para_elegirlos");
  if (dragging) headline = t("workspace:suelta_aqui");
  else if (full) headline = t("workspace:limite_alcanzado");
  else if (uploading) headline = t("workspace:subiendo_archivos");

  let stateClass = "cursor-pointer border-border hover:border-primary/50 hover:bg-primary/5";
  if (dragging) stateClass = "border-primary bg-primary/5";
  else if (disabled) stateClass = "cursor-not-allowed border-border/60 opacity-70";

  return (
    <label
      htmlFor="reference-files"
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors duration-200 select-none",
        "has-[:focus-visible]:border-primary has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        stateClass,
      )}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => {
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled && event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
      }}
    >
      <Icon
        name="cloud-arrow-up"
        size="text-4xl"
        className={cn("transition-colors", dragging ? "text-primary" : "text-muted-foreground/60")}
      />
      <span className="space-y-1">
        <span className="block text-sm font-semibold">{headline}</span>
        <span id="reference-files-hint" className="block text-xs text-muted-foreground">
          {ACCEPTED_LABEL}{t("workspace:maximo")} {String(max)} {t("workspace:archivos_234")} </span>
      </span>
      <input
        ref={input}
        id="reference-files"
        type="file"
        multiple
        accept={ACCEPTED_ATTR}
        disabled={disabled}
        aria-label={t("workspace:subir_archivos")}
        aria-describedby="reference-files-hint"
        className="sr-only"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) onFiles(event.target.files);
          event.target.value = "";
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            input.current?.click();
          }
        }}
      />
    </label>
  );
}
