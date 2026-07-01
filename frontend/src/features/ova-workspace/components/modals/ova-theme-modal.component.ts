import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, type OnInit, Output } from "@angular/core";
import type { OvaTheme } from "../../lib/types";
import { OvaThemeSelectorComponent } from "./ova-theme-selector.component";

@Component({
  selector: "gn-ova-theme-modal",
  standalone: true,
  imports: [CommonModule, OvaThemeSelectorComponent],
  template: `
    <div
      *ngIf="open"
      class="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
      (click)="onClose.emit()"
    ></div>
    
    <div *ngIf="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        class="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <p class="text-sm font-semibold">Tema visual del OVA</p>
            <p class="text-[10px] text-muted-foreground mt-0.5">
              {{ themeTitle }}
            </p>
          </div>
          <button
            type="button"
            (click)="onClose.emit()"
            class="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
          </button>
        </div>

        <div class="flex gap-4 p-5">
          <div class="flex-1 min-w-0">
            <gn-ova-theme-selector
              [theme]="draft"
              (themeChange)="draft = $event"
            ></gn-ova-theme-selector>
          </div>
          <div class="w-40 shrink-0 space-y-2 hidden sm:block">
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Vista previa
            </p>
            
            <div class="rounded-xl border border-border overflow-hidden shadow-md text-left">
              <div class="px-3 py-2.5" [style.background]="primaryColor">
                <p class="text-white font-bold text-[9px]">
                  Introducción a Machine Learning
                </p>
              </div>
              <div
                class="h-10 relative overflow-hidden"
                [style.background]="'linear-gradient(135deg, ' + primaryColor + '1A 0%, ' + accentColor + '26 100%)'"
              >
                <div class="absolute inset-0 flex items-center justify-center">
                  <div
                    class="h-5 w-5 rounded-full flex items-center justify-center"
                    [style.background]="accentColor + '33'"
                    [style.border]="'1.5px solid ' + accentColor + '66'"
                  >
                    <div
                      style="width: 0; height: 0; border-top: 3px solid transparent; border-bottom: 3px solid transparent; margin-left: 1px;"
                      [style.border-left]="'5px solid ' + accentColor"
                    ></div>
                  </div>
                </div>
              </div>
              <div class="p-2.5 bg-background space-y-1.5">
                <p
                  class="text-[7px] font-bold leading-none"
                  [style.color]="primaryColor"
                >
                  ¿Qué es una red neuronal?
                </p>
                <div class="h-1 rounded-full w-full bg-muted/70"></div>
                <div class="h-1 rounded-full w-5/6 bg-muted/70"></div>
                <div class="h-1 rounded-full w-4/6 bg-muted/70"></div>
                <div
                  class="rounded-md py-1 mt-1 text-center"
                  [style.background]="accentColor"
                >
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
      </div>
    </div>
  `,
})
export class OvaThemeModalComponent implements OnInit {
  @Input() open = false;
  @Input() theme: OvaTheme = { color: "upao", design: "upao" };
  @Output() themeChange = new EventEmitter<OvaTheme>();
  @Output() onClose = new EventEmitter<void>();

  draft: OvaTheme = { color: "upao", design: "upao" };

  ngOnInit() {
    this.draft = { ...this.theme };
  }

  get themeTitle() {
    if (this.draft.color === "upao" && this.draft.design === "upao")
      return "Marca institucional UPAO";
    if (this.draft.color === "free" && this.draft.design === "free")
      return "Estilo libre (IA elige)";
    return "Personalizado";
  }

  get primaryColor() {
    return this.draft.color === "upao" ? "#0A3D91" : "#6D28D9";
  }

  get accentColor() {
    return this.draft.color === "upao" ? "#F47A20" : "#A78BFA";
  }

  handleApply() {
    this.themeChange.emit(this.draft);
    this.onClose.emit();
  }
}
