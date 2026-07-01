import { computed, Injectable, inject, type OnDestroy, signal } from "@angular/core";
import { MessageService } from "primeng/api";
import type { OvaData, PhaseWithContent } from "../lib/types";
import { OvaEditService, type RegenBody } from "./ova-edit.service";

const POLL_MS = 3000;

@Injectable({
  providedIn: "root",
})
export class OvaWorkspaceService implements OnDestroy {
  private editService = inject(OvaEditService);
  private messageService = inject(MessageService, { optional: true });

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
    this.ovaId = ovaId;
    this.mounted = true;
    this.load();
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
        this.load();
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
    if (this.messageService) {
      this.messageService.add({ severity: "success", summary: "Éxito", detail });
    } else {
      console.log("SUCCESS:", detail);
    }
  }

  private toastError(detail: string) {
    if (this.messageService) {
      this.messageService.add({ severity: "error", summary: "Error", detail });
    } else {
      console.error("ERROR:", detail);
    }
  }

  ngOnDestroy() {
    this.mounted = false;
    if (this.regenTimer) clearTimeout(this.regenTimer);
    if (this.loadRetryTimer) clearTimeout(this.loadRetryTimer);
  }
}
