import { useRef } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { useOvaUploads } from "../../hooks/use-uploads";
import { FileChips } from "../shared/file-chips";

interface Props {
  prompt: string;
  onPrompt: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  uploads: ReturnType<typeof useOvaUploads>;
  placeholder?: string;
}

export function ChatComposer({
  prompt,
  onPrompt,
  onSubmit,
  busy,
  uploads,
  placeholder,
}: Readonly<Props>) {
  const fileInput = useRef<HTMLInputElement>(null);
  const disabled = busy || !prompt.trim() || uploads.uploading;

  return (
    <div className="space-y-2.5">
      <label htmlFor="chat-prompt" className="text-xs font-semibold text-foreground">
        Describe los cambios que deseas
      </label>
      <textarea
        id="chat-prompt"
        className="min-h-[96px] max-h-[220px] w-full resize-y rounded-xl border border-input bg-background p-3 text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        rows={3}
        placeholder={placeholder ?? "Escribe un cambio o mejora para el OVA…"}
        value={prompt}
        onChange={(event) => {
          onPrompt(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.ctrlKey && event.key === "Enter" && !disabled) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        aria-label="Archivo de apoyo"
        multiple
        accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
        onChange={(event) => {
          if (event.target.files) {
            void uploads.addFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />
      <FileChips files={uploads.data ?? []} onRemove={uploads.removeUpload} />
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label="Adjuntar archivo de apoyo"
            disabled={uploads.uploading}
            onClick={() => {
              fileInput.current?.click();
            }}
          >
            <Icon name="paperclip" className="size-3.5" />
            <span>Adjuntar</span>
          </Button>
          <span className="select-none text-[11px] text-muted-foreground">
            Ctrl+Enter para enviar
          </span>
        </div>
        <Button
          variant="default"
          size="sm"
          disabled={disabled}
          onClick={onSubmit}
          className="gap-1.5 px-3 font-medium shadow-2xs"
        >
          <Icon name="paper-plane-tilt" className="size-3.5" />
          <span>Enviar</span>
        </Button>
      </div>
    </div>
  );
}
