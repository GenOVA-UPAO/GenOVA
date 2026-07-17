import { computed, inject, Injectable, type OnDestroy, signal } from "@angular/core";
import { toast } from "@/core/lib/toast";

import type { OvaData, PhaseWithContent } from "../lib/types";
import { OvaEditService, type RegenBody } from "./ova-edit.service";

const POLL_MS = 3000;

@Injectable({
  providedIn: "root",
})
export class OvaWorkspaceService implements OnDestroy {
  private editService = inject(OvaEditService);

  // State
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

  // Accessors
  ova = this.ovaState.asReadonly();
  loading = this.loadingState.asReadonly();
  generating = this.generatingState.asReadonly();
  error = this.errorState.asReadonly();
  prompt = this.promptState.asReadonly();
  isRegenerating = this.isRegeneratingState.asReadonly();
  regenProgress = this.regenProgressState.asReadonly();

  // Derived
  phases = computed(() => (this.ovaState()?.current_version?.phases ?? []) as PhaseWithContent[]);
  versionNumber = computed(() => this.ovaState()?.current_version?.version_number ?? null);
  isReady = computed(() => this.ovaState()?.status === "listo");
  versionHistory = computed(() => this.ovaState()?.version_history ?? []);

  // Internals
  private ovaId: string | null = null;
  private mounted = false;
  private regenTimer: any = null;
  private loadRetryTimer: any = null;

  init(ovaId: string) {
    // Servicio singleton root: al navegar de un OVA a otro hay que limpiar el
    // estado del anterior (fases/prompt/error visibles hasta que resuelva el
    // fetch nuevo) y cancelar sus timers de polling.
    this.clearTimers();
    this.ovaState.set(null);
    this.promptState.set("");
    this.errorState.set("");
    this.generatingState.set(false);
    this.isRegeneratingState.set(false);
    this.regenProgressState.set({ percentage: 0, stage: "" });
    this.ovaId = ovaId;
    this.mounted = true;
    void this.load();
  }

  /** Cancela timers y desmonta; llamar desde el ngOnDestroy de la vista. */
  teardown() {
    this.mounted = false;
    this.clearTimers();
  }

  private clearTimers() {
    if (this.regenTimer) {
      clearTimeout(this.regenTimer);
      this.regenTimer = null;
    }
    if (this.loadRetryTimer) {
      clearTimeout(this.loadRetryTimer);
      this.loadRetryTimer = null;
    }
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
    if (await this.runRegen({ prompt: p, faseIds: selectedPhaseIds })) {
      this.setPrompt("");
    }
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
      (ovaId) => this.editService.savePhaseContent(ovaId, phaseId, content),
      "Recurso guardado.",
      "No se pudo guardar el recurso.",
    );
  }

  async deletePhase(phaseId: string) {
    await this.mutatePhase(
      (ovaId) => this.editService.deletePhase(ovaId, phaseId),
      "Recurso eliminado.",
      "No se pudo eliminar el recurso.",
    );
  }

  async addPhase(phaseType: string, prompt: string) {
    await this.mutatePhase(
      (ovaId) => this.editService.addPhase(ovaId, phaseType, prompt),
      "Recurso añadido.",
      "No se pudo añadir el recurso.",
    );
  }

  async reorderPhases(phases: PhaseWithContent[]) {
    const reorders = phases.map((p, idx) => ({ new_order: idx, phase_id: p.id }));
    await this.mutatePhase(
      (ovaId) => this.editService.reorderPhases(ovaId, reorders),
      "Orden actualizado.",
      "No se pudo reordenar.",
    );
  }

  /** Ejecuta una mutación de fase, notifica y recarga el OVA (misma pauta que onPhaseReverted). */
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

  // Poll
  private async pollRegen(jobId: string) {
    if (!this.mounted || !this.ovaId) return;
    try {
      const progress = (await this.editService.pollRegenProgress(this.ovaId, jobId)) as {
        percentage?: number;
        stage?: string;
        status?: string;
      };
      if (!this.mounted) return;

      this.regenProgressState.set({
        percentage: progress.percentage ?? 0,
        stage: progress.stage ?? "",
      });

      if (progress.status === "success" || progress.status === "error") {
        this.isRegeneratingState.set(false);
        void this.load();
        if (progress.status === "success") {
          this.toastSuccess("OVA regenerado.");
        } else {
          this.toastError("La regeneración falló.");
        }
      } else {
        this.regenTimer = setTimeout(() => this.pollRegen(jobId), POLL_MS);
      }
    } catch {
      if (this.mounted) {
        this.isRegeneratingState.set(false);
        this.toastError("Error al consultar el progreso de regeneración.");
      }
    }
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
