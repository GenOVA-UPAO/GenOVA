import { useQueryClient } from "@tanstack/react-query";
import i18n from "i18next";
import { useState } from "react";
import { toast } from "sonner";

import { recordEditorFeedback } from "../api/ova-workspace.api";
import { buildInitialSpec } from "../lib/initial-spec";
import {
  executeComposerApply,
  executeComposerEdit,
  type PendingConfirmation,
} from "../lib/visual-composer-actions";
import type {
  IntentTrace,
  InterpretedIntent,
  ResourceBlock,
  VisualSpec,
} from "../lib/visual-editor.types";

const ignoreError = () => undefined;

interface ConfirmationStateParams {
  ovaId: string;
  getPhaseId: () => string | undefined;
  editedBlocks: ResourceBlock[] | null;
  setHistory: React.Dispatch<React.SetStateAction<ResourceBlock[][]>>;
  setEditedBlocks: (blocks: ResourceBlock[]) => void;
  setComposedSpec: (spec: VisualSpec) => void;
  setStatusMessage: (msg: string | null) => void;
}

function useConfirmationState(params: ConfirmationStateParams) {
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const handleConfirmPending = () => {
    if (!pendingConfirmation) return;
    const { intent, newBlocks, trace, instruction, previousBlocks } = pendingConfirmation;
    params.setHistory((prev) => [...prev, params.editedBlocks ?? []]);
    params.setEditedBlocks(newBlocks);
    params.setComposedSpec(buildInitialSpec(newBlocks));
    setPendingConfirmation(null);
    params.setStatusMessage(
      i18n.t("workspace:changeApplied", { instruction: (instruction ?? "").trim() })
    );
    toast.success(
      i18n.t("workspace:cambio_confirmado_y_aplicado_con_exito_value_conf", { p0: Math.round(intent.confianza * 100).toString() })
    );

    if (params.ovaId) {
      void recordEditorFeedback(params.ovaId, {
        fase_id: params.getPhaseId(),
        instruccion: instruction,
        bloques_antes: previousBlocks ?? params.editedBlocks ?? [],
        intencion_propuesta: intent,
        intencion_final: intent,
        resultado: "applied",
        confianza: intent.confianza,
        backend: trace.backend,
      }).catch(ignoreError);
    }
  };

  const handleCancelPending = () => {
    if (pendingConfirmation && params.ovaId) {
      const { intent, trace, instruction, previousBlocks } = pendingConfirmation;
      void recordEditorFeedback(params.ovaId, {
        fase_id: params.getPhaseId(),
        instruccion: instruction,
        bloques_antes: previousBlocks ?? params.editedBlocks ?? [],
        intencion_propuesta: intent,
        resultado: "cancelled",
        confianza: intent.confianza,
        backend: trace.backend,
      }).catch(ignoreError);
    }
    setPendingConfirmation(null);
    params.setStatusMessage(i18n.t("workspace:accion_cancelada"));
    toast.info(i18n.t("workspace:accion_cancelada"));
  };

  return { pendingConfirmation, setPendingConfirmation, handleConfirmPending, handleCancelPending };
}

function useComposerEditorState() {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [editedBlocks, setEditedBlocks] = useState<ResourceBlock[] | null>(null);
  const [composedSpec, setComposedSpec] = useState<VisualSpec | null>(null);
  const [history, setHistory] = useState<ResourceBlock[][]>([]);
  const [lastIntent, setLastIntent] = useState<InterpretedIntent | null>(null);
  const [lastTrace, setLastTrace] = useState<IntentTrace | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = () => {
    setEditedBlocks(null);
    setComposedSpec(null);
    setLastIntent(null);
    setLastTrace(null);
    setHistory([]);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  return {
    prompt,
    setPrompt,
    isProcessing,
    setIsProcessing,
    isApplying,
    setIsApplying,
    editedBlocks,
    setEditedBlocks,
    composedSpec,
    setComposedSpec,
    history,
    setHistory,
    lastIntent,
    setLastIntent,
    lastTrace,
    setLastTrace,
    statusMessage,
    setStatusMessage,
    errorMessage,
    setErrorMessage,
    resetState,
  };
}

function performUndo(
  st: ReturnType<typeof useComposerEditorState>,
  ovaId: string,
  phaseId?: string
) {
  if (st.history.length === 0) {
    toast.error(i18n.t("workspace:no_hay_cambios_anteriores_para_deshacer"));
    return;
  }
  const previous = st.history[st.history.length - 1];
  st.setHistory((prev) => prev.slice(0, -1));
  st.setEditedBlocks(previous);
  st.setComposedSpec(buildInitialSpec(previous));
  const previousIntent = st.lastIntent;
  const previousBackend = st.lastTrace?.backend;
  st.setLastIntent(null);
  st.setStatusMessage(i18n.t("workspace:se_restauro_el_estado_anterior_de_bloques"));
  toast.info(i18n.t("workspace:cambio_deshecho_estado_anterior_restaurado"));

  if (ovaId) {
    void recordEditorFeedback(ovaId, {
      fase_id: phaseId,
      resultado: "undone",
      intencion_propuesta: previousIntent ?? undefined,
      backend: previousBackend ?? undefined,
    }).catch(ignoreError);
  }
}

interface PersistParams {
  queryClient: ReturnType<typeof useQueryClient>;
  ovaId: string;
  phaseIdToApply: string;
  blocksToApply: ResourceBlock[];
  instruction?: string;
}

async function persistPhaseVersion(params: PersistParams): Promise<boolean> {
  const ok = await executeComposerApply(
    params.ovaId,
    params.phaseIdToApply,
    params.blocksToApply,
    params.instruction ?? i18n.t("workspace:edicion_en_editor_visual")
  );
  if (ok) {
    await Promise.all([
      params.queryClient.invalidateQueries({
        queryKey: ["phase-blocks", params.ovaId, params.phaseIdToApply],
      }),
      params.queryClient.invalidateQueries({
        queryKey: ["phase-versions", params.ovaId, params.phaseIdToApply],
      }),
      params.queryClient.invalidateQueries({ queryKey: ["ova", params.ovaId] }),
    ]);
  }
  return ok;
}

export function useVisualComposer(ovaId: string, phaseId?: string) {
  const queryClient = useQueryClient();
  const st = useComposerEditorState();

  const confirmation = useConfirmationState({
    ovaId,
    getPhaseId: () => phaseId,
    editedBlocks: st.editedBlocks,
    setHistory: st.setHistory,
    setEditedBlocks: st.setEditedBlocks,
    setComposedSpec: st.setComposedSpec,
    setStatusMessage: st.setStatusMessage,
  });

  const handleEdit = (baseBlocks: ResourceBlock[], overridePhaseId?: string) => {
    const targetPhaseId = overridePhaseId ?? phaseId;
    if (!targetPhaseId) {
      toast.error(i18n.t("workspace:no_se_ha_seleccionado_una_fase"));
      return;
    }
    return executeComposerEdit({
      prompt: st.prompt,
      currentBlocks: st.editedBlocks ?? baseBlocks,
      ovaId,
      phaseId: targetPhaseId,
      setIsProcessing: st.setIsProcessing,
      setErrorMessage: st.setErrorMessage,
      setStatusMessage: st.setStatusMessage,
      setLastIntent: st.setLastIntent,
      setLastTrace: st.setLastTrace,
      setPendingConfirmation: confirmation.setPendingConfirmation,
      setHistory: st.setHistory,
      setEditedBlocks: st.setEditedBlocks,
      setComposedSpec: st.setComposedSpec,
    });
  };

  const handleApply = async (phaseIdToApply: string, fallbackBlocks: ResourceBlock[]) => {
    st.setIsApplying(true);
    try {
      const ok = await persistPhaseVersion({
        queryClient,
        ovaId,
        phaseIdToApply,
        blocksToApply: st.editedBlocks ?? fallbackBlocks,
        instruction: st.prompt,
      });
      if (ok) st.setHistory([]);
    } finally {
      st.setIsApplying(false);
    }
  };

  return {
    ...st,
    ...confirmation,
    canUndo: st.history.length > 0,
    handleEdit,
    handleUndo: () => {
      performUndo(st, ovaId, phaseId);
    },
    handleApply,
    resetState: () => {
      st.resetState();
      confirmation.setPendingConfirmation(null);
    },
  };
}
