import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit } from "@angular/core";
import { toast } from "sonner";
import { AdminSettingsService } from "../../../features/admin/services/admin-settings.service";

@Component({
  selector: "gn-platform-capabilities-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-display font-bold text-foreground">Capacidades de generación</h2>
          <p class="text-sm font-medium text-muted-foreground mt-1">
            Módulos auxiliares invocados por los agentes durante la generación.
          </p>
        </div>
        <button
          (click)="handleSave()"
          [disabled]="!hasChanges || saving"
          class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 font-bold shadow-md"
        >
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>

      <div *ngIf="loading || !draft" class="space-y-3">
        <div class="h-16 animate-pulse rounded-2xl bg-muted"></div>
        <div class="h-16 animate-pulse rounded-2xl bg-muted"></div>
      </div>

      <p *ngIf="!loading && error" class="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
        {{ error }}
      </p>

      <div *ngIf="!loading && !error && draft" class="rounded-3xl border border-border bg-card shadow-sm overflow-hidden glass-card">
        <div *ngFor="let cap of capabilities" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
          <div class="flex items-center gap-4 flex-1 min-w-0">
            <div class="h-10 w-10 rounded-2xl shrink-0 bg-primary/80 shadow-sm border border-primary/20 flex items-center justify-center">
              <span class="text-white text-sm font-bold uppercase">{{ getInitials(cap.name) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-bold text-foreground">{{ cap.name }}</span>
                <span *ngIf="cap.role" class="text-[9px] font-bold text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5 border border-border/50 tracking-widest uppercase">{{ cap.role }}</span>
                <span *ngIf="cap.id === 'video' && videoWarning" class="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-amber-200">
                  ⚠ API Key faltante
                </span>
              </div>
              <p class="text-[11px] font-medium text-muted-foreground mt-0.5 leading-snug">{{ cap.description }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3 shrink-0">
            <span *ngIf="cap.always_on" class="text-[10px] font-bold text-emerald-600 tracking-widest uppercase bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 shadow-sm">
              Siempre activo
            </span>
            <ng-container *ngIf="!cap.always_on">
              <span class="text-[10px] font-bold tracking-widest uppercase" [ngClass]="isCapActive(cap.flag) ? 'text-emerald-600' : 'text-muted-foreground'">
                {{ isCapActive(cap.flag) ? 'Activo' : 'Pausado' }}
              </span>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="isCapActive(cap.flag)"
                (click)="!saving && toggleCap(cap.flag)"
                [disabled]="saving"
                class="relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                [ngClass]="isCapActive(cap.flag) ? 'bg-primary' : 'bg-muted-foreground/30'"
              >
                <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" [ngClass]="isCapActive(cap.flag) ? 'translate-x-5' : 'translate-x-0'"></span>
              </button>
            </ng-container>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PlatformCapabilitiesCardComponent implements OnInit {
  service = inject(AdminSettingsService);

  loading = true;
  error = "";
  saving = false;

  data: any = null;
  draft: Record<string, string> | null = null;

  async ngOnInit() {
    this.loading = true;
    try {
      this.data = await this.service.getAdminNodesConfig();
      if (this.data?.config) {
        this.draft = { ...this.data.config };
      }
    } catch (e: any) {
      this.error = e.message || "No se pudo cargar la configuración.";
    } finally {
      this.loading = false;
    }
  }

  get capabilities(): any[] {
    return this.data?.capabilities ?? [];
  }

  get configurableCaps(): any[] {
    return this.capabilities.filter((c) => c.configurable);
  }

  get videoWarning(): boolean {
    return this.data ? !this.data.video_api_key_configured : false;
  }

  get hasChanges(): boolean {
    if (!this.draft) return false;
    return this.configurableCaps.some(
      (c) =>
        String(this.draft?.[c.flag] ?? c.default) !==
        String(this.data?.config?.[c.flag] ?? c.default),
    );
  }

  async handleSave() {
    this.saving = true;
    try {
      const updates: Record<string, string> = {};
      for (const c of this.configurableCaps) {
        updates[c.flag] = this.draft?.[c.flag] ?? c.default ?? "0";
      }
      await this.service.saveAdminNodesConfig(updates);
      if (this.data) this.data.config = { ...this.data.config, ...updates };
      toast.success("Capacidades guardadas.");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar.");
    } finally {
      this.saving = false;
    }
  }

  isCapActive(flag: string): boolean {
    if (!this.draft) return false;
    return this.draft[flag] === "1";
  }

  toggleCap(flag: string) {
    if (this.draft) {
      this.draft[flag] = this.draft[flag] === "1" ? "0" : "1";
    }
  }

  getInitials(name: string): string {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2);
  }
}
