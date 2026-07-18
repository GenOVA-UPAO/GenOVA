import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

import type { OvaTheme } from "../../lib/types";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-theme-selector",
  imports: [CommonModule, IconComponent],
  template: `
    <section class="space-y-2.5 rounded-lg border border-border bg-card p-3">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Tema del OVA
      </p>

      <!-- Color Axis -->
      <div class="space-y-1">
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-xs font-medium text-foreground">Color</p>
          <p class="text-[10px] text-muted-foreground">paleta de los recursos</p>
        </div>
        <div role="radiogroup" class="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            role="radio"
            aria-label="Color UPAO"
            [attr.aria-checked]="theme().color === 'upao'"
            (click)="setColor('upao')"
            [disabled]="disabled()"
            [ngClass]="getSegmentClass(theme().color === 'upao')"
          >
            <gn-icon name="square-half" size="text-sm" class="shrink-0" />
            <span>UPAO</span>
            <span class="flex items-center gap-0.5" aria-hidden="true">
              <span
                class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style="background-color: #0A3D91"
              ></span>
              <span
                class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style="background-color: #F47A20"
              ></span>
              <span
                class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style="background-color: #FFFFFF"
              ></span>
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-label="Color libre"
            [attr.aria-checked]="theme().color === 'free'"
            (click)="setColor('free')"
            [disabled]="disabled()"
            [ngClass]="getSegmentClass(theme().color === 'free')"
          >
            <gn-icon name="sparkle" size="text-sm" class="shrink-0" />
            <span>Libre</span>
          </button>
        </div>
      </div>

      <!-- Design Axis -->
      <div class="space-y-1">
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-xs font-medium text-foreground">Diseño</p>
          <p class="text-[10px] text-muted-foreground">estructura del recurso</p>
        </div>
        <div role="radiogroup" class="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            role="radio"
            aria-label="Diseño UPAO"
            [attr.aria-checked]="theme().design === 'upao'"
            (click)="setDesign('upao')"
            [disabled]="disabled()"
            [ngClass]="getSegmentClass(theme().design === 'upao')"
          >
            <gn-icon name="square-half" size="text-sm" class="shrink-0" />
            <span>UPAO</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-label="Diseño libre"
            [attr.aria-checked]="theme().design === 'free'"
            (click)="setDesign('free')"
            [disabled]="disabled()"
            [ngClass]="getSegmentClass(theme().design === 'free')"
          >
            <gn-icon name="sparkle" size="text-sm" class="shrink-0" />
            <span>Libre</span>
          </button>
        </div>
      </div>

      <p class="flex items-center gap-1 text-[10px] text-muted-foreground">
        <gn-icon name="magic-wand" size="text-xs" class="shrink-0" />
        @if (theme().color === "free" || theme().design === "free") {
          La IA decidirá lo marcado como «Libre».
        }
        @if (theme().color !== "free" && theme().design !== "free") {
          Marca institucional UPAO: azul, naranja y blanco.
        }
      </p>
    </section>
  `,
})
export class OvaThemeSelectorComponent {
  readonly theme = input<OvaTheme>({ color: "upao", design: "upao" });
  readonly disabled = input(false);
  readonly themeChange = output<OvaTheme>();

  getSegmentClass(active: boolean) {
    const base =
      "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
    if (active) {
      return `${base} bg-background text-foreground shadow-sm ring-1 ring-primary/30`;
    }
    return `${base} text-muted-foreground hover:text-foreground hover:bg-background/60`;
  }

  setColor(c: string) {
    this.themeChange.emit({ ...this.theme(), color: c });
  }

  setDesign(d: string) {
    this.themeChange.emit({ ...this.theme(), design: d });
  }
}
