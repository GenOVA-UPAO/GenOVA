import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit } from "@angular/core";
import { toast } from "sonner";
import { AdminSettingsService } from "../../../features/admin/services/admin-settings.service";
import { criticRoundsVisible, hasUnsavedChanges } from "../lib/nodesConfigDraft";

@Component({
  selector: "gn-platform-nodes-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-display font-bold text-foreground">Nodos del orquestador</h2>
          <p class="text-sm font-medium text-muted-foreground mt-1">
            Activa o desactiva agentes del grafo de generación. Los cambios aplican en ~30s.
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
        <div class="h-16 animate-pulse rounded-2xl bg-muted"></div>
      </div>

      <p *ngIf="!loading && error" class="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
        {{ error }}
      </p>

      <div *ngIf="!loading && !error && draft" class="space-y-6">
        
        <div class="rounded-3xl border border-border bg-card shadow-sm overflow-hidden glass-card">
          <div class="px-6 py-4 border-b border-border/50 bg-muted/20">
            <p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Configurables ({{ configurableNodes.length }})
            </p>
          </div>
          <div class="flex flex-col">
            <div *ngFor="let node of configurableNodes" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
              <div class="flex items-center gap-4 flex-1 min-w-0">
                <div class="h-10 w-10 rounded-2xl shrink-0 bg-primary shadow-sm border border-primary/20 flex items-center justify-center">
                  <span class="text-white text-sm font-bold uppercase">{{ getInitials(node.name) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-foreground">{{ node.name }}</span>
                    <span *ngIf="node.role" class="text-[9px] font-bold text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5 border border-border/50 tracking-widest uppercase">{{ node.role }}</span>
                  </div>
                  <p class="text-[11px] font-medium text-muted-foreground mt-0.5 leading-snug">{{ node.description }}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-4 shrink-0 mt-3 sm:mt-0">
                <div *ngIf="node.param && showParam()" class="flex items-center gap-2 bg-muted/20 px-3 py-1.5 rounded-xl border border-border/50 shadow-sm">
                  <label [for]="'rounds-' + node.id" class="text-xs font-bold text-muted-foreground">{{ node.param.label }}</label>
                  <input
                    [id]="'rounds-' + node.id"
                    type="number"
                    [min]="node.param.min"
                    [max]="node.param.max"
                    [value]="rounds"
                    (input)="setRounds($event)"
                    [disabled]="saving"
                    class="w-14 rounded-lg border border-border bg-background px-2 py-1 text-sm font-mono font-bold text-center outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-bold tracking-widest uppercase" [ngClass]="isNodeActive(node.flag) ? 'text-emerald-600' : 'text-muted-foreground'">
                    {{ isNodeActive(node.flag) ? 'Activo' : 'Pausado' }}
                  </span>
                  
                  <button
                    type="button"
                    role="switch"
                    [attr.aria-checked]="isNodeActive(node.flag)"
                    (click)="!saving && toggleNode(node.flag)"
                    [disabled]="saving"
                    class="relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                    [ngClass]="isNodeActive(node.flag) ? 'bg-primary' : 'bg-muted-foreground/30'"
                  >
                    <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" [ngClass]="isNodeActive(node.flag) ? 'translate-x-5' : 'translate-x-0'"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-border bg-card shadow-sm overflow-hidden glass-card">
          <div class="px-6 py-4 border-b border-border/50 bg-muted/20">
            <p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Siempre activos ({{ alwaysOnNodes.length + (videoNode ? 1 : 0) }})
            </p>
          </div>
          <div class="flex flex-col">
            <div *ngFor="let n of alwaysOnNodes" class="flex items-center gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
              <div class="h-10 w-10 rounded-2xl shrink-0 shadow-sm border border-black/10 flex items-center justify-center" [ngClass]="getBadgeColor(n.name, false)">
                <span class="text-white text-sm font-bold uppercase">{{ getInitials(n.name) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-foreground flex items-center gap-2">{{ n.name }}</p>
                <p class="text-[11px] font-medium text-muted-foreground mt-0.5">{{ n.description || 'Nodo base del sistema.' }}</p>
              </div>
              <span class="text-[10px] font-bold mr-2 text-emerald-600 tracking-widest uppercase bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 shadow-sm">Siempre activo</span>
            </div>
            
            <div *ngIf="videoNode" class="flex items-center gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
              <div class="h-10 w-10 rounded-2xl shrink-0 shadow-sm border border-black/10 flex items-center justify-center" [ngClass]="getBadgeColor(videoNode.name, videoWarning)">
                <span class="text-white text-sm font-bold uppercase">{{ getInitials(videoNode.name) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-foreground flex items-center gap-2">
                  {{ videoNode.name }}
                  <span *ngIf="videoWarning" class="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-amber-200">
                    ⚠ API Key faltante
                  </span>
                </p>
                <p class="text-[11px] font-medium text-muted-foreground mt-0.5">{{ videoNode.description || 'Nodo base del sistema.' }}</p>
              </div>
              <span class="text-[10px] font-bold mr-2 text-emerald-600 tracking-widest uppercase bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 shadow-sm">Siempre activo</span>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  `,
})
export class PlatformNodesCardComponent implements OnInit {
  service = inject(AdminSettingsService);

  loading = true;
  error = "";
  saving = false;

  data: any = null;
  draft: Record<string, string> | null = null;
  rounds = 1;

  async ngOnInit() {
    this.loading = true;
    try {
      this.data = await this.service.getAdminNodesConfig();
      if (this.data?.config) {
        this.draft = { ...this.data.config };
        this.rounds = Number(this.data.config.ova_reflection_rounds ?? 1);
      }
    } catch (e: any) {
      this.error = e.message || "No se pudo cargar la configuración de nodos.";
    } finally {
      this.loading = false;
    }
  }

  get hasChanges(): boolean {
    return hasUnsavedChanges(this.draft, this.data?.config, this.rounds);
  }

  async handleSave() {
    this.saving = true;
    try {
      const payload = { ...this.draft, ova_reflection_rounds: String(this.rounds) };
      await this.service.saveAdminNodesConfig(payload);
      this.data.config = payload;
      toast.success("Configuración de nodos guardada.");
    } catch (e: any) {
      toast.error(e.message || "No se pudo guardar.");
    } finally {
      this.saving = false;
    }
  }

  get configurableNodes(): any[] {
    return (this.data?.nodes ?? []).filter((n: any) => n.configurable);
  }

  get alwaysOnNodes(): any[] {
    return (this.data?.nodes ?? []).filter((n: any) => n.always_on && n.id !== "video");
  }

  get videoNode(): any {
    return (this.data?.nodes ?? []).find((n: any) => n.id === "video");
  }

  get videoWarning(): boolean {
    return this.data ? !this.data.video_api_key_configured : false;
  }

  showParam(): boolean {
    return criticRoundsVisible(this.draft);
  }

  isNodeActive(flag: string): boolean {
    if (!this.draft) return false;
    return this.draft[flag] === "1";
  }

  toggleNode(flag: string) {
    if (this.draft) {
      this.draft[flag] = this.draft[flag] === "1" ? "0" : "1";
    }
  }

  setRounds(e: Event) {
    const el = e.target as HTMLInputElement;
    this.rounds = Number(el.value);
  }

  getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  }

  getBadgeColor(name: string, warning: boolean): string {
    if (warning) return "bg-amber-500";
    const colors = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-purple-500",
      "bg-amber-500",
      "bg-teal-500",
      "bg-indigo-500",
    ];
    return colors[name.length % colors.length];
  }
}
