import type { KeyboardEvent } from "react";
import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { MAX_PER_PHASE } from "../../lib/phase-select.config";
import { WorkspaceModal } from "../shared/workspace-modal";

interface Props {
  ovaId: string;
  phaseType: string;
  currentCount: number;
  onClose: () => void;
}

function handleCtrlEnter(event: KeyboardEvent<HTMLTextAreaElement>, submit: () => void): void {
  if (event.ctrlKey && event.key === "Enter") submit();
}

export default function AddResourceModal({ ovaId, phaseType, currentCount, onClose }: Readonly<Props>) {
  const [prompt, setPrompt] = useState("");
  const { addPhase } = useOvaWorkspace(ovaId);
  const full = currentCount >= MAX_PER_PHASE;
  const submit = () => {
    if (!prompt.trim() || addPhase.isPending) return;
    addPhase.mutate({ phaseType, prompt: prompt.trim() }, { onSuccess: onClose });
  };
  return (
    <WorkspaceModal title={`Añadir recurso — ${phaseType}`} onClose={onClose}>
      {full ? (
        <p>Esta fase ya tiene el máximo de {MAX_PER_PHASE} recursos.</p>
      ) : (
        <label>
          Instrucciones
          <textarea
            className="block w-full rounded border p-3"
            placeholder={`Ej: Añade un ejemplo práctico de ${phaseType} con código Python`}
            value={prompt}
            disabled={addPhase.isPending}
            onChange={(event) => {
              setPrompt(event.target.value);
            }}
            onKeyDown={(event) => {
              handleCtrlEnter(event, submit);
            }}
          />
        </label>
      )}
      {!full && <p className="text-[10px] text-muted-foreground">Ctrl+Enter para guardar</p>}
      {!full && (
        <Button
          disabled={!prompt.trim() || addPhase.isPending}
          onClick={submit}
        >
          Añadir recurso
        </Button>
      )}
      {addPhase.error && <p role="alert">{addPhase.error.message}</p>}
    </WorkspaceModal>
  );
}
