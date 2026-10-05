import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { phaseMeta } from "../../lib/phase-meta";
import { MAX_PER_PHASE } from "../../lib/phase-select.config";
import type { PhaseWithContent } from "../../lib/types";
import { ModalActions } from "../shared/modal-actions";
import { WorkspaceModal } from "../shared/workspace-modal";

interface Props {
  ovaId: string;
  phaseType: string;
  currentCount: number;
  onClose: () => void;
  /** El recurso ya existe (con su marcador pendiente): hay que generarlo. */
  onAdded?: (phase: PhaseWithContent, prompt: string) => void;
}

export default function AddResourceModal({ ovaId, phaseType, currentCount, onClose, onAdded }: Readonly<Props>) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const { addPhase } = useOvaWorkspace(ovaId);
  const full = currentCount >= MAX_PER_PHASE;
  const phaseLabel = phaseMeta(phaseType).label || phaseType;
  const empty = !prompt.trim();
  const submit = () => {
    if (empty || addPhase.isPending) return;
    const instructions = prompt.trim();
    addPhase.mutate(
      { phaseType, prompt: instructions },
      {
        onSuccess: (phase) => {
          onAdded?.(phase, instructions);
          onClose();
        },
      },
    );
  };
  return (
    <WorkspaceModal
      title={t("workspace:anadir_recurso_a_value", { p0: phaseLabel })}
      description={t("workspace:la_ia_creara_un_recurso_nuevo_con_tus_instruc_43edd9")}
      size="md"
      onClose={onClose}
      footer={
        <ModalActions status={!full && (empty ? t("workspace:escribe_las_instrucciones_para_anadirlo") : t("workspace:ctrl_enter_para_anadir"))}>
          <Button variant="outline" onClick={onClose}>
            {full ? t("workspace:cerrar") : t("workspace:cancelar")}
          </Button>
          {!full && (
            <Button disabled={empty} loading={addPhase.isPending} onClick={submit}>
              {t("workspace:anadir_recurso")} </Button>
          )}
        </ModalActions>
      }
    >
      {full ? (
        <p className="text-sm">{t("workspace:esta_fase_ya_tiene_el_maximo_de")} {MAX_PER_PHASE} {t("workspace:recursos_elimina_uno_para_anadir_otro")}</p>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="add-resource-prompt" className="text-sm font-medium">
            {t("workspace:instrucciones")} </label>
          <textarea
            id="add-resource-prompt"
            rows={4}
            className="block w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-base leading-relaxed placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
            placeholder={t("workspace:ej_un_ejercicio_practico_sobre_el_sobreajuste_49764f")}
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
