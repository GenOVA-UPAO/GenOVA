import { useRef } from "react";

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
export function ChatComposer({ prompt, onPrompt, onSubmit, busy, uploads, placeholder }: Readonly<Props>) {
  const fileInput = useRef<HTMLInputElement>(null);
  const disabled = busy || !prompt.trim() || uploads.uploading;
  return (
    <div className="space-y-3">
      <label htmlFor="chat-prompt">Describe los cambios que deseas</label>
      <textarea
        id="chat-prompt"
        className="w-full rounded-lg border bg-background p-3"
        rows={5}
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
      <div className="flex gap-2">
        <Button
          variant="outline"
          aria-label="Adjuntar archivo de apoyo"
          disabled={uploads.uploading}
          onClick={() => fileInput.current?.click()}
        >
          Adjuntar
        </Button>
        <Button disabled={disabled} onClick={onSubmit}>
          Enviar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Ctrl+Enter para enviar</p>
    </div>
  );
}
