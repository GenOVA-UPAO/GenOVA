import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, signal } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { apiFetch } from "@/core/lib/http";
import {
  type Palette,
  ThemeMiniPreviewComponent,
  ThemeRadioOptionComponent,
} from "./theme-modal-controls";

export interface ThemeState {
  colorMode: string;
  designMode: string;
  palette: Palette | null;
}

const COLOR_MODES = [
  { key: "ai", label: "IA elige", desc: "La IA selecciona colores según el contenido del OVA" },
  { key: "upao", label: "Paleta UPAO", desc: "Azul institucional #0A3D91 + naranja #F47A20" },
  { key: "custom", label: "Personalizado", desc: "Escoge tu propia combinación de colores" },
];

const DESIGN_MODES = [
  { key: "ai", label: "IA elige", desc: "La IA decide layout, tipografía y estructura" },
  { key: "upao", label: "Plantilla UPAO", desc: "Estructura académica con navegación 5E en tabs" },
  { key: "custom", label: "Mis plantillas", desc: "Usa una plantilla guardada o crea una nueva" },
];

const PALETTES: Palette[] = [
  { name: "UPAO", p: "#0A3D91", a: "#F47A20" },
  { name: "Oceano", p: "#164E63", a: "#38BDF8" },
  { name: "Bosque", p: "#14532D", a: "#86EFAC" },
  { name: "Fuego", p: "#7F1D1D", a: "#FCA5A5" },
  { name: "Lavanda", p: "#4C1D95", a: "#C4B5FD" },
  { name: "Cobre", p: "#78350F", a: "#FCD34D" },
  { name: "Pizarra", p: "#1E293B", a: "#94A3B8" },
  { name: "Rosa", p: "#831843", a: "#F9A8D4" },
];

@Component({
  selector: "gn-theme-modal",
  standalone: true,
  imports: [CommonModule, DialogModule, ThemeRadioOptionComponent, ThemeMiniPreviewComponent],
  template: `
    <p-dialog
      [visible]="true"
      [modal]="true"
      [closable]="false"
      (onHide)="onClose.emit()"
      [style]="{width: '42rem', 'max-width': '100%'}"
      [showHeader]="false"
      contentStyleClass="p-0 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
    >
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 class="text-lg font-display font-semibold">Configuración de Diseño y Tema</h2>
        <button
          type="button"
          (click)="onClose.emit()"
          aria-label="Cerrar"
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer"
        >
          <!-- <X size={20} /> -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
        </button>
      </div>

      <div class="max-h-[72vh] overflow-y-auto">
        <div class="flex gap-4 p-5">
          <div class="flex-1 space-y-5 min-w-0">
            <div class="space-y-1.5">
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paleta de colores</p>
              
              <gn-theme-radio-option
                *ngFor="let m of colorModes"
                [label]="m.label"
                [desc]="m.desc"
                [checked]="theme().colorMode === m.key"
                (onClick)="set('colorMode', m.key)"
              ></gn-theme-radio-option>
              
              <div *ngIf="theme().colorMode === 'custom'" class="flex flex-wrap gap-1.5 pt-1 pl-1">
                <button
                  *ngFor="let pal of palettes"
                  type="button"
                  (click)="set('palette', pal)"
                  [title]="pal.name"
                  [ngClass]="{
                    'border-primary scale-105': theme().palette?.name === pal.name,
                    'border-transparent hover:border-border': theme().palette?.name !== pal.name
                  }"
                  class="flex gap-px rounded-lg p-0.5 border-2 cursor-pointer transition"
                >
                  <div class="h-5 w-5 rounded-l" [style.background]="pal.p"></div>
                  <div class="h-5 w-5 rounded-r" [style.background]="pal.a"></div>
                </button>
              </div>
            </div>

            <div class="space-y-1.5">
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Diseño / Plantilla</p>
              
              <gn-theme-radio-option
                *ngFor="let m of designModes"
                [label]="m.label"
                [desc]="m.desc"
                [checked]="theme().designMode === m.key"
                (onClick)="set('designMode', m.key)"
              ></gn-theme-radio-option>
            </div>
          </div>

          <div class="w-44 shrink-0 space-y-2">
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Previsualización</p>
            <gn-theme-mini-preview
              [colorMode]="theme().colorMode"
              [designMode]="theme().designMode"
              [palette]="theme().palette"
            ></gn-theme-mini-preview>
            <p class="text-[10px] text-muted-foreground text-center leading-snug">Estructura y colores aproximados</p>
          </div>
        </div>

        <div class="border-t border-border px-5 py-4 space-y-2">
          <p *ngIf="saveError()" class="text-xs text-destructive text-center">{{ saveError() }}</p>
          <button
            type="button"
            (click)="handleSave()"
            [disabled]="saving()"
            class="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity disabled:opacity-50"
          >
            {{ saving() ? 'Guardando...' : 'Aplicar tema' }}
          </button>
        </div>
      </div>
    </p-dialog>
  `,
})
export class ThemeModalComponent {
  @Input() set initialTheme(val: ThemeState | null | undefined) {
    if (val) this.theme.set(val);
  }

  @Output() onClose = new EventEmitter<void>();
  @Output() onSaved = new EventEmitter<ThemeState>();

  theme = signal<ThemeState>({ colorMode: "upao", designMode: "upao", palette: null });
  saving = signal(false);
  saveError = signal("");

  colorModes = COLOR_MODES;
  designModes = DESIGN_MODES;
  palettes = PALETTES;

  set(key: keyof ThemeState, val: unknown) {
    this.theme.update((t) => ({ ...t, [key]: val }));
  }

  async handleSave() {
    this.saving.set(true);
    this.saveError.set("");

    try {
      const res = await apiFetch("/api/users/me/theme", {
        method: "PATCH",
        body: JSON.stringify(this.theme()),
      });

      if (res.ok) {
        this.onSaved.emit(this.theme());
        this.onClose.emit();
      } else {
        const data = (await res.json().catch(() => ({}))) as { detail?: string; message?: string };
        this.saveError.set(data?.detail || data?.message || "No se pudo guardar el tema.");
      }
    } catch {
      this.saveError.set("No se pudo conectar con el servidor.");
    } finally {
      this.saving.set(false);
    }
  }
}
