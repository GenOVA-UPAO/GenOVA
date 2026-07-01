import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit } from "@angular/core";
import { toast } from "sonner";
import { AdminSettingsService } from "../../../features/admin/services/admin-settings.service";
import {
  type Draft,
  type EffectiveConfig,
  type Entry,
  toDraft,
  toPayload,
} from "../lib/llmConfigDraft";
import { LlmTaskRowComponent } from "./llm-task-row.component";

@Component({
  selector: "gn-platform-llm-config-card",
  standalone: true,
  imports: [CommonModule, LlmTaskRowComponent],
  template: `
    <section class="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-display font-bold text-foreground">Modelos de generación</h2>
          <p class="text-sm font-medium text-muted-foreground mt-1">
            Modelo primario y cadena de fallback por tarea, usados por todos los OVAs. Solo admins. Los cambios aplican en ~30s.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" class="text-primary hidden sm:block"><path d="M224,104a8,8,0,0,1-16,0V88a8,8,0,0,0-8-8H200v32a8,8,0,0,1-16,0V80H160v16a8,8,0,0,1-16,0V80H112v16a8,8,0,0,1-16,0V80H56v32a8,8,0,0,1-16,0V80H40a8,8,0,0,0-8,8v16a8,8,0,0,1-16,0V88a24,24,0,0,1,24-24H216a24,24,0,0,1,24,24Z" opacity="0.2"></path><path d="M216,56H40A32,32,0,0,0,8,88v16a16,16,0,0,0,16,16H40v56a32,32,0,0,0,32,32h32v18.37A32,32,0,1,0,152,226.37V208h32a32,32,0,0,0,32-32V120h16a16,16,0,0,0,16-16V88A32,32,0,0,0,216,56Zm8,48H200v64a16,16,0,0,1-16,16H72a16,16,0,0,1-16-16V104H32V88A16,16,0,0,1,48,72H208a16,16,0,0,1,16,16ZM136,240a16,16,0,1,1,16-16A16,16,0,0,1,136,240ZM88,144a12,12,0,1,1,12-12A12,12,0,0,1,88,144Zm96-12a12,12,0,1,1-12-12A12,12,0,0,1,184,132Z"></path></svg>
          <button
            (click)="handleSave()"
            [disabled]="!draft || saving"
            class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 font-bold w-full sm:w-auto shadow-md"
          >
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>

      <div *ngIf="loading || !draft" class="grid gap-6 sm:grid-cols-2">
        <div class="h-44 animate-pulse rounded-3xl bg-muted"></div>
        <div class="h-44 animate-pulse rounded-3xl bg-muted"></div>
        <div class="h-44 animate-pulse rounded-3xl bg-muted"></div>
        <div class="h-44 animate-pulse rounded-3xl bg-muted"></div>
      </div>

      <p *ngIf="!loading && error" class="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
        {{ error }}
      </p>

      <ng-container *ngIf="!loading && !error && draft">
        <div class="grid gap-6 xl:grid-cols-2">
          <gn-llm-task-row
            *ngFor="let t of tasks"
            [task]="t"
            [value]="draft[t]"
            [models]="catalog"
            [disabled]="saving"
            (onChange)="handleChange(t, $event)"
          ></gn-llm-task-row>
        </div>
      </ng-container>
    </section>
  `,
})
export class PlatformLlmConfigCardComponent implements OnInit {
  service = inject(AdminSettingsService);

  loading = true;
  error = "";
  saving = false;

  data: any = null;
  tasks: string[] = [];
  catalog: any[] = [];
  draft: Draft | null = null;

  async ngOnInit() {
    this.loading = true;
    try {
      this.data = await this.service.getAdminLlmConfig();
      this.tasks = this.data?.tasks ?? [];
      this.catalog = this.data?.catalog ?? [];

      if (this.data) {
        this.draft = toDraft(this.data.config as EffectiveConfig, this.tasks);
      }
    } catch (e: any) {
      this.error = e.message || "No se pudo cargar la configuración.";
    } finally {
      this.loading = false;
    }
  }

  handleChange(task: string, next: { default?: Entry; fallbacks?: Entry[] }) {
    if (this.draft) {
      this.draft = { ...this.draft, [task]: next as any };
    }
  }

  async handleSave() {
    this.saving = true;
    try {
      const payload = toPayload(this.draft, this.tasks);
      await this.service.saveAdminLlmConfig(payload);
      toast.success("Configuración de modelos guardada.");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar.");
    } finally {
      this.saving = false;
    }
  }
}
