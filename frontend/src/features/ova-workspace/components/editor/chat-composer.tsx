import type { ReactNode } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { useOvaUploads } from "../../hooks/use-uploads";
import { FileChips } from "../shared/file-chips";
import { ChatAttachButton } from "./chat-attach-button";

interface Props {
  prompt: string;
  onPrompt: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  uploads: ReturnType<typeof useOvaUploads>;
  placeholder?: string;
  /** Alcance de la instrucción (el OVA entero o solo los recursos marcados), a la derecha del label. */
  scope?: ReactNode;
  /** Selector de recursos, visible solo al limitar el alcance. */
  picker?: ReactNode;
  error?: string;
}

const HINT_ID = "chat-prompt-hint";

function hintText(busy: boolean, uploading: boolean, empty: boolean): string {
  if (busy) return "Espera a que termine la regeneración en curso.";
  if (uploading) return "Subiendo archivos…";
  if (empty) return "Escribe un cambio para poder aplicarlo.";
  return "Ctrl+Enter para aplicar";
}

export function ChatComposer({
  prompt,
  onPrompt,
  onSubmit,
  busy,
  uploads,
  placeholder,
  scope,
  picker,
  error,
}: Readonly<Props>) {
  const empty = !prompt.trim();
  const disabled = busy || empty || uploads.uploading;
  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <Icon name="warning-circle" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label htmlFor="chat-prompt" className="text-sm font-medium text-foreground">
          Describe los cambios que deseas
        </label>
        {scope}
      </div>
      {picker}
      <textarea
        id="chat-prompt"
        className="block max-h-56 min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-base leading-relaxed placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
        rows={3}
        aria-describedby={HINT_ID}
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
      <FileChips files={uploads.data ?? []} onRemove={uploads.removeUpload} />
      <div className="flex items-center gap-2">
        <ChatAttachButton uploads={uploads} />
        <p id={HINT_ID} aria-live="polite" className="min-w-0 flex-1 text-xs text-muted-foreground">
          {hintText(busy, uploads.uploading, empty)}
        </p>
        <Button
          disabled={disabled}
          aria-describedby={HINT_ID}
          className="max-md:h-11"
          onClick={onSubmit}
        >
          <Icon name="paper-plane-tilt" />
          Aplicar cambios
        </Button>
      </div>
    </div>
  );
}
