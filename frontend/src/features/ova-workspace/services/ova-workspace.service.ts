import { computed, inject, Injectable, type OnDestroy, signal } from "@angular/core";

import { toast } from "@/core/lib/toast";

import {
  assistantRunningMessage,
  finishChatPatch,
  labelsForPhaseIds,
  patchChatMessage,
  progressChatPatch,
  type RegenChatMessage,
  userChatMessage,
} from "../lib/regen-chat";
import type { OvaData, PhaseWithContent } from "../lib/types";
import { OvaEditService, type RegenBody } from "./ova-edit.service";

const POLL_MS = 3000;

@Injectable({ providedIn: "root" })
export class OvaWorkspaceService implements OnDestroy {
  private editService = inject(OvaEditService);

  private ovaState = signal<OvaData | null>(null);
  private loadingState = signal(true);
  private generatingState = signal(false);
  private errorState = signal("");
  private promptState = signal("");
  private isRegeneratingState = signal(false);
  private regenProgressState = signal<{ percentage: number; stage: string }>({
    percentage: 0,
    stage: "",
  });
  private chatMessagesState = signal<RegenChatMessage[]>([]);
  private activeAssistantId: string | null = null;

  ova = this.ovaState.asReadonly();
  loading = this.loadingState.asReadonly();
  generating = this.generatingState.asReadonly();
  error = this.errorState.asReadonly();
  prompt = this.promptState.asReadonly();
  isRegenerating = this.isRegeneratingState.asReadonly();
  regenProgress = this.regenProgressState.asReadonly();
  chatMessages = this.chatMessagesState.asReadonly();

  phases = computed(() => (this.ovaState()?.current_version?.phases ?? []) as PhaseWithContent[]);
  versionNumber = computed(() => this.ovaState()?.current_version?.version_number ?? null);
  isReady = computed(() => this.ovaState()?.status === "listo");
  versionHistory = computed(() => this.ovaState()?.version_history ?? []);

  private ovaId: string | null = null;
  private mounted = false;
  private regenTimer: ReturnType<typeof setTimeout> | null = null;
  private loadRetryTimer: ReturnType<typeof setTimeout> | null = null;

  init(ovaId: string) {
    this.clearTimers();
    this.ovaState.set(null);
    this.promptState.set("");
    this.errorState.set("");
    this.generatingState.set(false);
    this.isRegeneratingState.set(false);
    this.regenProgressState.set({ percentage: 0, stage: "" });
    this.chatMessagesState.set([]);
    this.activeAssistantId = null;
    this.ovaId = ovaId;
    this.mounted = true;
    void this.load();
  }

  teardown() {
    this.mounted = false;
    this.clearTimers();
  }

  private clearTimers() {
    if (this.regenTimer) clearTimeout(this.regenTimer);
    if (this.loadRetryTimer) clearTimeout(this.loadRetryTimer);
    this.regenTimer = null;
    this.loadRetryTimer = null;
  }

  setPrompt(value: string) {
    this.promptState.set(value);
  }

  async load() {
    if (!this.ovaId) return;
    this.loadingState.set(true);
    this.errorState.set("");
    try {
      const data = (await this.editService.fetchOvaEditorData(this.ovaId)) as OvaData;
      if (!this.mounted) return;
      this.ovaState.set(data);
      this.generatingState.set(false);
    } catch (err: any) {
      if (!this.mounted) return;
      if (err?.status === 409 || err?.code === "ova_generating") {
        this.generatingState.set(true);
        this.loadRetryTimer = setTimeout(() => this.load(), 3000);
      } else {
        this.errorState.set(err?.message || "No se pudo cargar el OVA.");
      }
    } finally {
      if (this.mounted) this.loadingState.set(false);
    }
  }

  async runRegen(body: RegenBody): Promise<boolean> {
    if (!this.ovaId) return false;
    this.isRegeneratingState.set(true);
    this.regenProgressState.set({ percentage: 0, stage: "" });
    try {
      const { job_id } = (await this.editService.triggerRegen(this.ovaId, body)) as {
        job_id: string;
      };
      this.regenTimer = setTimeout(() => this.pollRegen(job_id), POLL_MS);
      return true;
    } catch (err: any) {
      this.isRegeneratingState.set(false);
      this.toastError(err?.message || "No se pudo iniciar la regeneración.");
      return false;
    }
  }

  async submitPrompt(selectedPhaseIds: string[] = []) {
    if (!this.promptState().trim() || this.isRegeneratingState()) return;
    const p = this.promptState().trim();
    await this.startTrackedRegen(
      userChatMessage(p, labelsForPhaseIds(this.phases(), selectedPhaseIds)),
      { prompt: p, faseIds: selectedPhaseIds },
      "Iniciando regeneración…",
    );
  }

  async submitRegenAll() {
    if (this.isRegeneratingState()) return;
    await this.startTrackedRegen(
      userChatMessage("Regenerar OVA completo"),
      { prompt: null, faseIds: [] },
      "Regenerando el OVA completo…",
    );
  }

  private async startTrackedRegen(
    userMsg: RegenChatMessage,
    body: RegenBody,
    assistantText: string,
  ) {
    const assistant = assistantRunningMessage(assistantText, userMsg.resourceLabels);
    this.chatMessagesState.update((msgs) => [...msgs, userMsg, assistant]);
    this.activeAssistantId = assistant.id;
    if (await this.runRegen(body)) {
      this.setPrompt("");
      return;
    }
    this.patchAssistant(assistant.id, {
      status: "error",
      text: "No se pudo iniciar la regeneración.",
      percentage: 0,
    });
    this.activeAssistantId = null;
  }

  async downloadScorm() {
    if (!this.ovaId) return;
    try {
      await this.editService.downloadEditedScorm(this.ovaId);
    } catch (err: any) {
      this.toastError(err?.message || "No se pudo descargar el SCORM.");
    }
  }

  async savePhase(phaseId: string, content: string) {
    await this.mutatePhase(
      (id) => this.editService.savePhaseContent(id, phaseId, content),
      "Recurso guardado.",
      "No se pudo guardar el recurso.",
    );
  }

  async deletePhase(phaseId: string) {
    await this.mutatePhase(
      (id) => this.editService.deletePhase(id, phaseId),
      "Recurso eliminado.",
      "No se pudo eliminar el recurso.",
    );
  }

  async addPhase(phaseType: string, prompt: string) {
    await this.mutatePhase(
      (id) => this.editService.addPhase(id, phaseType, prompt),
      "Recurso añadido.",
      "No se pudo añadir el recurso.",
    );
  }

  async reorderPhases(phases: PhaseWithContent[]) {
    const reorders = phases.map((p, idx) => ({ new_order: idx, phase_id: p.id }));
    await this.mutatePhase(
      (id) => this.editService.reorderPhases(id, reorders),
      "Orden actualizado.",
      "No se pudo reordenar.",
    );
  }

  private async mutatePhase(
    action: (ovaId: string) => Promise<unknown>,
    okMsg: string,
    failMsg: string,
  ) {
    if (!this.ovaId) return;
    try {
      await action(this.ovaId);
      this.toastSuccess(okMsg);
      await this.load();
    } catch (err: any) {
      this.toastError(err?.message || failMsg);
    }
  }

  private async pollRegen(jobId: string) {
    if (!this.mounted || !this.ovaId) return;
    try {
      const progress = (await this.editService.pollRegenProgress(this.ovaId, jobId)) as {
        percentage?: number;
        stage?: string;
        status?: string;
      };
      if (!this.mounted) return;
      const percentage = progress.percentage ?? 0;
      const stage = progress.stage ?? "";
      this.regenProgressState.set({ percentage, stage });
      if (this.activeAssistantId) {
        this.patchAssistant(this.activeAssistantId, progressChatPatch(percentage, stage));
      }
      if (progress.status === "success" || progress.status === "error") {
        this.isRegeneratingState.set(false);
        void this.load();
        if (this.activeAssistantId) {
          const labels = this.chatMessagesState().find((m) => m.id === this.activeAssistantId)
            ?.resourceLabels;
          this.patchAssistant(this.activeAssistantId, finishChatPatch(progress.status, labels));
        }
        this.activeAssistantId = null;
        if (progress.status === "success") this.toastSuccess("OVA regenerado.");
        else this.toastError("La regeneración falló.");
      } else {
        this.regenTimer = setTimeout(() => this.pollRegen(jobId), POLL_MS);
      }
    } catch {
      if (!this.mounted) return;
      this.isRegeneratingState.set(false);
      if (this.activeAssistantId) {
        this.patchAssistant(this.activeAssistantId, {
          status: "error",
          text: "Error al consultar el progreso de regeneración.",
        });
        this.activeAssistantId = null;
      }
      this.toastError("Error al consultar el progreso de regeneración.");
    }
  }

  private patchAssistant(id: string, patch: Partial<RegenChatMessage>) {
    this.chatMessagesState.update((msgs) => patchChatMessage(msgs, id, patch));
  }

  private toastSuccess(detail: string) {
    toast.success("Éxito", { description: detail });
  }

  private toastError(detail: string) {
    toast.error("Error", { description: detail });
  }

  ngOnDestroy() {
    this.teardown();
  }
}
