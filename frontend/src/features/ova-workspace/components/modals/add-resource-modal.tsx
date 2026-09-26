import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { phaseMeta } from "../../lib/phase-meta";
import { MAX_PER_PHASE } from "../../lib/phase-select.config";
import { ModalActions } from "../shared/modal-actions";
import { WorkspaceModal } from "../shared/workspace-modal";

interface Props {
  ovaId: string;
  phaseType: string;
  currentCount: number;
  onClose: () => void;
}

export default function AddResourceModal({ ovaId, phaseType, currentCount, onClose }: Readonly<Props>) {
  const [prompt, setPrompt] = useState("");
  const { addPhase } = useOvaWorkspace(ovaId);
  const full = currentCount >= MAX_PER_PHASE;
  const phaseLabel = phaseMeta(phaseType).label || phaseType;
  const empty = !prompt.trim();
  const submit = () => {
    if (empty || addPhase.isPending) return;
    addPhase.mutate({ phaseType, prompt: prompt.trim() }, { onSuccess: onClose });
  };
  return (
    <WorkspaceModal
      title={`Añadir recurso a ${phaseLabel}`}
      description="La IA creará un recurso nuevo con tus instrucciones y lo pondrá al final de la fase."
      size="md"
      onClose={onClose}
      footer={
        <ModalActions status={!full && (empty ? "Escribe las instrucciones para añadirlo." : "Ctrl+Enter para añadir")}>
          <Button variant="outline" onClick={onClose}>
            {full ? "Cerrar" : "Cancelar"}
          </Button>
          {!full && (
            <Button disabled={empty} loading={addPhase.isPending} onClick={submit}>
              Añadir recurso
            </Button>
          )}
        </ModalActions>
      }
    >
      {full ? (
        <p className="text-sm">Esta fase ya tiene el máximo de {MAX_PER_PHASE} recursos. Elimina uno para añadir otro.</p>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="add-resource-prompt" className="text-sm font-medium">
            Instrucciones
          </label>
          <textarea
            id="add-resource-prompt"
            rows={4}
            className="block w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-base leading-relaxed placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
            placeholder="Ej.: un ejercicio práctico sobre el sobreajuste con su solución."
            value={prompt}
            disabled={addPhase.isPending}
            onChange={(event) => {
              setPrompt(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.key === "Enter") submit();
            }}
          />
        </div>
      )}
      {addPhase.error && <p role="alert" className="text-sm text-destructive">{addPhase.error.message}</p>}
    </WorkspaceModal>
  );
}
