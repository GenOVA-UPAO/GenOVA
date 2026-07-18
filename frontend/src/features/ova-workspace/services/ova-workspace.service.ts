import { computed, inject, Injectable, type OnDestroy, signal } from "@angular/core";

import { toast } from "@/core/lib/toast";

import {
  assistantRunningMessage,
  labelsForPhaseIds,
  type RegenChatMessage,
  userChatMessage,
} from "../lib/regen-chat";
import { handleRegenPollTick, type RegenProgressDto } from "../lib/regen-poll";
import type { OvaData, PhaseWithContent } from "../lib/types";
import { OvaEditService, type RegenBody } from "./ova-edit.service";
import { OvaWorkspaceChatService } from "./ova-workspace-chat.service";

const POLL_MS = 3000;

@Injectable({ providedIn: "root" })
export class OvaWorkspaceService implements OnDestroy {
  private editService = inject(OvaEditService);
  private chat = inject(OvaWorkspaceChatService);

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
  private activeAssistantId: string | null = null;

  ova = this.ovaState.asReadonly();
  loading = this.loadingState.asReadonly();
  generating = this.generatingState.asReadonly();
  error = this.errorState.asReadonly();
  prompt = this.promptState.asReadonly();
  isRegenerating = this.isRegeneratingState.asReadonly();
  regenProgress = this.regenProgressState.asReadonly();
  chatMessages = this.chat.messages;

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
    this.activeAssistantId = null;
    this.chat.reset(ovaId);
    this.ovaId = ovaId;
    this.mounted = true;
    void this.load();
    void this.chat.load(ovaId);
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

  logSelectionMode(enabled: boolean) {
    return this.chat.logSelectionMode(enabled);
  }

  logSelectionToggle(label: string, selected: boolean) {
    return this.chat.logSelectionToggle(label, selected);
  }

  logSelectionAll(labels: string[], allSelected: boolean) {
    return this.chat.logSelectionAll(labels, allSelected);
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
      toast.error("Error", { description: err?.message || "No se pudo iniciar la regeneración." });
      return false;
    }
  }

  async submitPrompt(selectedPhaseIds: string[] = []) {
    if (!this.promptState().trim() || this.isRegeneratingState()) return;
    const p = this.promptState().trim();
    const labels = labelsForPhaseIds(this.phases(), selectedPhaseIds);
    const asstText = labels?.length
      ? `Regenerando ${labels.length === 1 ? `«${labels[0]}»` : `${labels.length} recursos`}…`
      : "Regenerando el OVA completo…";
    await this.startTrackedRegen(
      userChatMessage(p, { kind: "prompt", resourceLabels: labels }),
      { prompt: p, faseIds: selectedPhaseIds },
      asstText,
    );
  }

  async submitRegenAll() {
    if (this.isRegeneratingState()) return;
    const userMsg = await this.chat.logRegenAllIntent();
    await this.startTrackedRegen(
      userMsg,
      { prompt: null, faseIds: [] },
      "Regenerando el OVA completo…",
      { skipUserAppend: true },
    );
  }

  private async startTrackedRegen(
    userMsg: RegenChatMessage,
    body: RegenBody,
    assistantText: string,
    opts: { skipUserAppend?: boolean } = {},
  ) {
    const assistant = assistantRunningMessage(assistantText, userMsg.resourceLabels);
    if (opts.skipUserAppend) {
      await this.chat.append(assistant);
    } else {
      await this.chat.appendMany([userMsg, assistant]);
    }
    this.activeAssistantId = assistant.id;
    if (await this.runRegen(body)) {
      this.setPrompt("");
      return;
    }
    await this.chat.patch(assistant.id, {
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
      toast.error("Error", { description: err?.message || "No se pudo descargar el SCORM." });
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
      toast.success("Éxito", { description: okMsg });
      await this.load();
    } catch (err: any) {
      toast.error("Error", { description: err?.message || failMsg });
    }
  }

  private async pollRegen(jobId: string) {
    if (!this.ovaId) return;
    const ovaId = this.ovaId;
    await handleRegenPollTick(jobId, {
      mounted: () => this.mounted,
      setProgress: (p) => {
        this.regenProgressState.set(p);
      },
      getAssistantId: () => this.activeAssistantId,
      getAssistantLabels: () =>
        this.chat.messages().find((m) => m.id === this.activeAssistantId)?.resourceLabels,
      patchChat: (id, patch) => this.chat.patch(id, patch),
      onTerminal: () => {
        this.isRegeneratingState.set(false);
        this.activeAssistantId = null;
        void this.load();
      },
      onSuccess: () => {
        toast.success("Éxito", { description: "OVA regenerado." });
      },
      onError: (msg) => {
        toast.error("Error", { description: msg });
      },
      schedule: (id) => {
        this.regenTimer = setTimeout(() => this.pollRegen(id), POLL_MS);
      },
      fetchProgress: (id) =>
        this.editService.pollRegenProgress(ovaId, id) as Promise<RegenProgressDto>,
    });
  }

  ngOnDestroy() {
    this.teardown();
  }
}
