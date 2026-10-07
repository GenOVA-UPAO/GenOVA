import i18n from "i18next";
import { toast } from "sonner";

import {
  confirmPhaseBlocks,
  editPhaseBlocks,
  recordEditorFeedback,
} from "../api/ova-workspace.api";
import { buildInitialSpec } from "./initial-spec";
import type {
  IntentTrace,
  InterpretedIntent,
  ResourceBlock,
  VisualSpec,
} from "./visual-editor.types";

export interface PendingConfirmation {
  intent: InterpretedIntent;
  newBlocks: ResourceBlock[];
  trace: IntentTrace;
  instruction?: string;
  previousBlocks?: ResourceBlock[];
}

export interface EditActionContext {
  prompt: string;
  currentBlocks: ResourceBlock[];
  ovaId: string;
  phaseId: string;
  setIsProcessing: (val: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  setStatusMessage: (msg: string | null) => void;
  setLastIntent: (intent: InterpretedIntent) => void;
  setLastTrace: (trace: IntentTrace) => void;
  setPendingConfirmation: (val: PendingConfirmation | null) => void;
  setHistory: (updater: (prev: ResourceBlock[][]) => ResourceBlock[][]) => void;
  setEditedBlocks: (blocks: ResourceBlock[]) => void;
  setComposedSpec: (spec: VisualSpec) => void;
}

const ignoreError = () => undefined;

function extractErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const errorObj = err as { body?: { detail?: string | { message?: string } }; message?: string };
    if (typeof errorObj.body?.detail === "string") {
      return errorObj.body.detail;
    }
    if (typeof errorObj.body?.detail?.message === "string") {
      return errorObj.body.detail.message;
    }
    if (errorObj.message) {
      return errorObj.message;
    }
  }
  return i18n.t("workspace:error_al_procesar_la_instruccion_de_edicion");
}

function handleIntentResult(
  ctx: EditActionContext,
  intent: InterpretedIntent,
  newBlocks: ResourceBlock[],
  trace: IntentTrace
): void {
  ctx.setLastIntent(intent);
  ctx.setLastTrace(trace);

  if (intent.accion === "ninguna") {
    const msg = intent.motivo ?? i18n.t("workspace:instruccion_ambigua_o_no_aplicable_823");
    ctx.setStatusMessage(msg);
    if (intent.es_fuera_de_alcance) {
      ctx.setErrorMessage(msg);
      void recordEditorFeedback(ctx.ovaId, {
        fase_id: ctx.phaseId,
        instruccion: ctx.prompt,
        resultado: "rejected_guard",
        motivo_rechazo: msg,
        backend: trace.backend,
      }).catch(ignoreError);
    }
    toast.info(msg);
    return;
  }

  if (intent.requiere_confirmacion) {
    ctx.setPendingConfirmation({
      intent,
      newBlocks,
      trace,
      instruction: ctx.prompt,
      previousBlocks: ctx.currentBlocks,
    });
    ctx.setStatusMessage(i18n.t("workspace:confirmas_la_aplicacion_de_este_cambio_estructural"));
    toast.info(i18n.t("workspace:structureConfirmationHint"));
    return;
  }

  ctx.setHistory((prev) => [...prev, ctx.currentBlocks]);
  ctx.setEditedBlocks(newBlocks);
  ctx.setComposedSpec(buildInitialSpec(newBlocks));
  ctx.setStatusMessage(i18n.t("workspace:changeApplied", { instruction: ctx.prompt.trim() }));
  toast.success(i18n.t("workspace:cambio_aplicado_con_exito_value_conf", { p0: Math.round(intent.confianza * 100).toString() }));

  void recordEditorFeedback(ctx.ovaId, {
    fase_id: ctx.phaseId,
    instruccion: ctx.prompt,
    bloques_antes: ctx.currentBlocks,
    intencion_propuesta: intent,
    intencion_final: intent,
    resultado: "applied",
    confianza: intent.confianza,
    backend: trace.backend,
  }).catch(ignoreError);
}

export async function executeComposerEdit(ctx: EditActionContext): Promise<void> {
  const trimmed = ctx.prompt.trim();
  if (!trimmed) {
    toast.error(i18n.t("workspace:ingresa_una_instruccion_de_cambio"));
    return;
  }

  ctx.setIsProcessing(true);
  ctx.setErrorMessage(null);
  ctx.setPendingConfirmation(null);
  ctx.setStatusMessage(i18n.t("workspace:interpretando_intencion_con_backend_python"));

  try {
    const { intent, blocks: newBlocks, trace } = await editPhaseBlocks({
      ovaId: ctx.ovaId,
      phaseId: ctx.phaseId,
      blocks: ctx.currentBlocks,
      instruction: trimmed,
    });
    handleIntentResult(ctx, intent, newBlocks, trace);
  } catch (err: unknown) {
    const msg = extractErrorMessage(err);
    ctx.setErrorMessage(msg);
    toast.error(msg);
    void recordEditorFeedback(ctx.ovaId, {
      fase_id: ctx.phaseId,
      instruccion: trimmed,
      resultado: "rejected_guard",
      motivo_rechazo: msg,
      backend: "backend_guard",
    }).catch(ignoreError);
  } finally {
    ctx.setIsProcessing(false);
  }
}

export async function executeComposerApply(
  ovaId: string,
  phaseId: string,
  blocks: ResourceBlock[],
  instruction?: string
): Promise<boolean> {
  if (blocks.length === 0 || !phaseId) {
    toast.error(i18n.t("workspace:no_hay_una_version_para_aplicar"));
    return false;
  }

  try {
    const res = await confirmPhaseBlocks(ovaId, phaseId, blocks, instruction);
    if (!res.success) {
      throw new Error(res.message || i18n.t("workspace:no_se_pudo_guardar_la_version"));
    }
    const ver = res.version_number ? ` v${String(res.version_number)}` : "";
    toast.success(i18n.t("workspace:versionSaved", { p0: ver }));
    return true;
  } catch (err: unknown) {
    const msg = extractErrorMessage(err);
    toast.error(i18n.t("workspace:error_al_aplicar_la_version_value", { p0: msg }));
    return false;
  }
}
