import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { DialogComponent } from "@/core/components/ui/dialog.component";

import type { OvaTheme } from "../../lib/types";
import { OvaThemeSelectorComponent } from "./ova-theme-selector.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-theme-modal",
  imports: [OvaThemeSelectorComponent, IconComponent, DialogComponent],
  template: `
    <gn-dialog [open]="open()" width="34rem" (openChange)="onOpenChange($event)">
      <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <p class="text-sm font-semibold">Tema visual del OVA</p>
          <p class="text-[10px] text-muted-foreground mt-0.5">
            {{ themeTitle() }}
          </p>
        </div>
        <button
          type="button"
          (click)="onClose.emit()"
          class="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          aria-label="Cerrar"
        >
          <gn-icon name="x" size="text-sm" />
        </button>
      </div>
      <div class="flex gap-4 p-5">
        <div class="flex-1 min-w-0">
          <gn-ova-theme-selector
            [theme]="draft()"
            (themeChange)="draft.set($event)"
          ></gn-ova-theme-selector>
        </div>
        <div class="w-40 shrink-0 space-y-2 hidden sm:block">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Vista previa
          </p>
          <div class="rounded-xl border border-border overflow-hidden shadow-md text-left">
            <div class="px-3 py-2.5" [style.background]="primaryColor()">
              <p class="text-white font-bold text-[9px]">Introducción al tema</p>
            </div>
            <div
              class="h-10 relative overflow-hidden"
              [style.background]="
                'linear-gradient(135deg, ' + primaryColor() + '1A 0%, ' + accentColor() + '26 100%)'
              "
            >
              <div class="absolute inset-0 flex items-center justify-center">
                <div
                  class="h-5 w-5 rounded-full flex items-center justify-center"
                  [style.background]="accentColor() + '33'"
                  [style.border]="'1.5px solid ' + accentColor() + '66'"
                >
                  <div
                    style="width: 0; height: 0; border-top: 3px solid transparent; border-bottom: 3px solid transparent; margin-left: 1px;"
                    [style.border-left]="'5px solid ' + accentColor()"
                  ></div>
                </div>
              </div>
            </div>
            <div class="p-2.5 bg-background space-y-1.5">
              <p class="text-[7px] font-bold leading-none" [style.color]="primaryColor()">
                ¿Qué es una red neuronal?
              </p>
              <div class="h-1 rounded-full w-full bg-muted/70"></div>
              <div class="h-1 rounded-full w-5/6 bg-muted/70"></div>
              <div class="h-1 rounded-full w-4/6 bg-muted/70"></div>
              <div class="rounded-md py-1 mt-1 text-center" [style.background]="accentColor()">
                <p class="text-[6px] font-bold text-white">Continuar →</p>
              </div>
            </div>
          </div>
          <p class="text-[10px] text-muted-foreground/70 text-center leading-snug">
            Colores y estructura aproximados
          </p>
        </div>
      </div>
      <div class="border-t border-border px-5 py-4">
        <button
          type="button"
          (click)="handleApply()"
          class="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity"
        >
          Aplicar tema
        </button>
      </div>
    </gn-dialog>
  `,
})
export class OvaThemeModalComponent {
  readonly open = input(false);
  readonly theme = input<OvaTheme>({ color: "upao", design: "upao" });
  readonly themeChange = output<OvaTheme>();
  readonly onClose = output();

  readonly draft = signal<OvaTheme>({ color: "upao", design: "upao" });

  constructor() {
    // Re-sincroniza el draft en cada apertura: con solo ngOnInit, reabrir el
    // modal mostraba el draft abandonado y "Aplicar" revertía el tema real.
    effect(() => {
      if (this.open()) this.draft.set({ ...this.theme() });
    });
  }

  readonly themeTitle = computed(() => {
    const d = this.draft();
    if (d.color === "upao" && d.design === "upao") return "Marca institucional UPAO";
    if (d.color === "free" && d.design === "free") return "Estilo libre (IA elige)";
    return "Personalizado";
  });

  readonly primaryColor = computed(() => (this.draft().color === "upao" ? "#0A3D91" : "#6D28D9"));

  readonly accentColor = computed(() => (this.draft().color === "upao" ? "#F47A20" : "#A78BFA"));

  /** gn-dialog dismissal (Esc, backdrop click, close button) → siempre cierra. */
  onOpenChange(isOpen: boolean): void {
    if (!isOpen) this.onClose.emit();
  }

  handleApply() {
    this.themeChange.emit(this.draft());
    this.onClose.emit();
  }
}
